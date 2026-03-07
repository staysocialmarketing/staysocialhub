
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast } from "date-fns";
import {
  CheckSquare,
  MessageSquarePlus,
  FileEdit,
  ArrowRight,
  Calendar,
  Clock,
  AlertTriangle,
  ClipboardList,
  Users,
  Sparkles,
  CheckCircle2,
  UserPlus,
} from "lucide-react";

const TASK_STATUSES = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  waiting: "Waiting", review: "Review", complete: "Complete",
};

// ─── Work Queue Dashboard (Admin + Team) ─────────────────────────────────────

function WorkQueueDashboard() {
  const { profile, isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"my" | "team" | "all">("my");

  // Fetch SS users for assign dropdown
  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_team", "ss_producer", "ss_ops"]);
      if (!roles?.length) return [];
      const ids = [...new Set(roles.map(r => r.user_id))];
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", ids);
      return users || [];
    },
  });

  // ── My Tasks ──
  const { data: myTasks = [] } = useQuery({
    queryKey: ["wq-tasks", profile?.id, filter, globalClientId],
    queryFn: async () => {
      let q = supabase.from("tasks")
        .select("id, title, status, priority, due_at, assigned_to_user_id, assigned_to_team, client_id, project_id, clients(name), projects(name)")
        .not("status", "eq", "complete")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(10);
      if (filter === "my") {
        q = q.or(`assigned_to_user_id.eq.${profile!.id},assigned_to_team.eq.true`);
      }
      if (globalClientId) q = q.eq("client_id", globalClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  // ── My Requests ──
  const { data: myRequests = [] } = useQuery({
    queryKey: ["wq-requests", profile?.id, filter, globalClientId],
    queryFn: async () => {
      let q = supabase.from("requests")
        .select("id, topic, type, priority, status, created_at, assigned_to_user_id, client_id, created_by_user_id, clients(name), users!requests_created_by_user_id_fkey(name)")
        .not("status", "eq", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (filter === "my") {
        q = q.eq("assigned_to_user_id", profile!.id);
      }
      if (globalClientId) q = q.eq("client_id", globalClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  // ── Approvals Waiting (internal_review + client_approval) ──
  const { data: approvalsWaiting = [] } = useQuery({
    queryKey: ["wq-approvals"],
    queryFn: async () => {
      const { data } = await supabase.from("posts")
        .select("id, title, content_type, created_at, status_column, client_id, clients(name)")
        .in("status_column", ["internal_review", "client_approval"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // ── Overdue Work ──
  const { data: overdueItems = [] } = useQuery({
    queryKey: ["wq-overdue", profile?.id, filter, globalClientId],
    queryFn: async () => {
      const now = new Date().toISOString();
      let tq = supabase.from("tasks")
        .select("id, title, due_at, status, priority, client_id, assigned_to_user_id, clients(name)")
        .lt("due_at", now)
        .not("status", "eq", "complete")
        .order("due_at", { ascending: true })
        .limit(10);
      if (filter === "my") {
        tq = tq.or(`assigned_to_user_id.eq.${profile!.id},assigned_to_team.eq.true`);
      }
      if (globalClientId) tq = tq.eq("client_id", globalClientId);
      let pq = supabase.from("posts")
        .select("id, title, due_at, status_column, client_id, assigned_to_user_id, clients(name)")
        .lt("due_at", now)
        .not("status_column", "eq", "published")
        .order("due_at", { ascending: true })
        .limit(10);
      if (filter === "my") {
        pq = pq.eq("assigned_to_user_id", profile!.id);
      }
      if (globalClientId) pq = pq.eq("client_id", globalClientId);
      const [{ data: tasks }, { data: posts }] = await Promise.all([tq, pq]);
      const items: any[] = [];
      (tasks || []).forEach(t => items.push({ ...t, _type: "task", _status: t.status }));
      (posts || []).forEach(p => items.push({ ...p, _type: "post", _status: p.status_column }));
      items.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
      return items;
    },
    enabled: !!profile,
  });

  // ── Stats counts ──
  const taskCount = myTasks.length;
  const requestCount = myRequests.length;
  const approvalCount = approvalsWaiting.length;
  const overdueCount = overdueItems.length;

  // ── Quick actions ──
  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["wq-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["wq-overdue"] });
  };

  const updateTaskAssignee = async (taskId: string, userId: string) => {
    await supabase.from("tasks").update({ assigned_to_user_id: userId }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["wq-tasks"] });
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    await supabase.from("requests").update({ status: status as any }).eq("id", requestId);
    queryClient.invalidateQueries({ queryKey: ["wq-requests"] });
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const u = ssUsers.find(u => u.id === userId);
    return u?.name || u?.email || "Unknown";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Work Queue</h2>
          <p className="text-muted-foreground mt-1">
            {profile?.name ? `Welcome back, ${profile.name.split(" ")[0]}` : "Your workspace"}
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="my">My Work</TabsTrigger>
            <TabsTrigger value="team">Team Work</TabsTrigger>
            {isSSAdmin && <TabsTrigger value="all">All Work</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/team/tasks")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{taskCount}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/requests")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Requests</CardTitle>
            <MessageSquarePlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{requestCount}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approvals Waiting</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{approvalCount}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{overdueCount}</div></CardContent>
        </Card>
      </div>

      {/* My Tasks Section */}
      <DashboardSection title="My Tasks" icon={<ClipboardList className="h-5 w-5 text-primary" />} viewAllUrl="/team/tasks" onViewAll={() => navigate("/team/tasks")}>
        {myTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No outstanding tasks 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {myTasks.map((task: any) => (
              <li key={task.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => navigate("/team/tasks")}>
                  <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                  {task.clients?.name && <span className="text-xs text-muted-foreground shrink-0">{task.clients.name}</span>}
                  {task.projects?.name && <span className="text-xs text-muted-foreground shrink-0">· {task.projects.name}</span>}
                  {task.due_at && (
                    <span className={`text-xs shrink-0 ${isPast(new Date(task.due_at)) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {format(new Date(task.due_at), "MMM d")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] capitalize">{task.priority}</Badge>
                  <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[100px] border-none bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{TASK_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Mark Complete" onClick={() => updateTaskStatus(task.id, "complete")}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Select value={task.assigned_to_user_id || ""} onValueChange={(v) => updateTaskAssignee(task.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-7 border-none bg-transparent p-0" title="Assign">
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {ssUsers.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      {/* My Requests Section */}
      <DashboardSection title="My Requests" icon={<MessageSquarePlus className="h-5 w-5 text-primary" />} viewAllUrl="/requests" onViewAll={() => navigate("/requests")}>
        {myRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No assigned requests</p>
        ) : (
          <ul className="divide-y divide-border">
            {myRequests.map((req: any) => (
              <li key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => navigate("/requests")}>
                  <span className="text-sm font-medium text-foreground truncate">{req.topic}</span>
                  {req.clients?.name && <span className="text-xs text-muted-foreground shrink-0">{req.clients.name}</span>}
                  {req.users?.name && <span className="text-xs text-muted-foreground shrink-0">by {req.users.name}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(req.created_at), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] capitalize">{req.priority}</Badge>
                  <Select value={req.status} onValueChange={(v) => updateRequestStatus(req.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[100px] border-none bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open" className="text-xs">Open</SelectItem>
                      <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                      <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>


    </div>
  );
}

// ─── Dashboard Section Wrapper ───────────────────────────────────────────────

function DashboardSection({ title, icon, children, viewAllUrl, onViewAll }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  viewAllUrl?: string;
  onViewAll?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}

// ─── Client Dashboard ────────────────────────────────────────────────────────

function ClientDashboard() {
  const { profile, isClientAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["client-pending-approvals", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "client_approval").eq("client_id", profile.client_id);
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: openRequests = 0 } = useQuery({
    queryKey: ["client-open-requests", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "open").eq("client_id", profile.client_id);
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: clientData } = useQuery({
    queryKey: ["client-plan-and-addons", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase.from("clients").select("name, plans(name, includes_json), whats_new_visible_addons, recommended_item_id").eq("id", profile.client_id).single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const { data: marketplaceItems = [] } = useQuery({
    queryKey: ["client-marketplace-items"],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_items").select("*").eq("is_active", true).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: sentCampaigns = 0 } = useQuery({
    queryKey: ["client-sent-campaigns", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "sent").eq("client_id", profile.client_id).eq("content_type", "email_campaign");
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["client-scheduled-posts", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data } = await supabase.from("posts").select("id, title, platform, scheduled_at").eq("client_id", profile.client_id).gt("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(5);
      return data || [];
    },
    enabled: !!profile?.client_id,
  });

  const recommendedItem = (clientData as any)?.recommended_item_id
    ? marketplaceItems.find((i: any) => i.id === (clientData as any).recommended_item_id)
    : marketplaceItems[0] || null;
  const newestItem = marketplaceItems.find((i: any) => i.id !== recommendedItem?.id) || null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h2>
        <p className="text-muted-foreground mt-1">Here's what's happening with your marketing.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/requests?type=social_post")}>
            <FileEdit className="h-5 w-5 text-primary" />
            <span className="font-medium">Request a Social Post</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/requests?type=email_campaign")}>
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <span className="font-medium">Request an Email Campaign</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/approvals")}>
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Review Content</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Approval</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Content ready for review</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/requests")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Requests</CardTitle>
            <MessageSquarePlus className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{openRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Requests being worked on</p>
          </CardContent>
        </Card>
      </div>

      {scheduledPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Next Scheduled Posts</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {scheduledPosts.map((post: any) => (
                  <li key={post.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/approvals/${post.id}`)}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-[80px]">{format(new Date(post.scheduled_at), "MMM d")}</span>
                      <span className="text-sm font-medium text-foreground">{post.title}</span>
                    </div>
                    {post.platform && <Badge variant="secondary" className="text-xs">{post.platform.split(",")[0].trim()}</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {clientData && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/plan")}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-foreground">{(clientData as any).plans?.name || "No plan assigned"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {(recommendedItem || newestItem) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold text-foreground">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendedItem && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/30 ring-1 ring-primary/10" onClick={() => navigate("/whats-new")}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{(recommendedItem as any).icon || "⭐"}</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Recommended</Badge>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{(recommendedItem as any).name}</h4>
                  {(recommendedItem as any).description && <p className="text-xs text-muted-foreground">{(recommendedItem as any).description}</p>}
                  {(recommendedItem as any).price && <p className="text-xs font-medium text-primary">{(recommendedItem as any).price}</p>}
                  <Button size="sm" variant="default" className="mt-2">Learn More</Button>
                </CardContent>
              </Card>
            )}
            {newestItem && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/whats-new")}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{(newestItem as any).icon || "🆕"}</span>
                    <Badge variant="outline" className="text-[10px]">New</Badge>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{(newestItem as any).name}</h4>
                  {(newestItem as any).description && <p className="text-xs text-muted-foreground">{(newestItem as any).description}</p>}
                  {(newestItem as any).price && <p className="text-xs font-medium text-primary">{(newestItem as any).price}</p>}
                  <Button size="sm" variant="outline" className="mt-2">Learn More</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isSSRole, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  return isSSRole ? <WorkQueueDashboard /> : <ClientDashboard />;
}
