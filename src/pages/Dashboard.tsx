import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
} from "lucide-react";

// ─── Super Admin Dashboard ───────────────────────────────────────────────────

function SuperAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["sa-pending-approvals"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "client_approval");
      return count || 0;
    },
  });

  const { data: openRequests = 0 } = useQuery({
    queryKey: ["sa-open-requests"],
    queryFn: async () => {
      const { count } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "open");
      return count || 0;
    },
  });

  const { data: overduePosts = 0 } = useQuery({
    queryKey: ["sa-overdue"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).lt("due_at", new Date().toISOString()).not("status_column", "eq", "published");
      return count || 0;
    },
  });

  const { data: dueTodayPosts = 0 } = useQuery({
    queryKey: ["sa-due-today"],
    queryFn: async () => {
      const s = new Date(); s.setHours(0,0,0,0);
      const e = new Date(); e.setHours(23,59,59,999);
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).gte("due_at", s.toISOString()).lte("due_at", e.toISOString()).not("status_column", "eq", "published");
      return count || 0;
    },
  });

  // Team activity: posts assigned to ss_producer/ss_ops users, not published
  const { data: teamActivity = [] } = useQuery({
    queryKey: ["sa-team-activity"],
    queryFn: async () => {
      // Get SS team users
      const { data: teamRoles } = await supabase.from("user_roles").select("user_id, role").in("role", ["ss_producer", "ss_ops"]);
      if (!teamRoles?.length) return [];
      const userIds = [...new Set(teamRoles.map((r) => r.user_id))];
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", userIds);
      const { data: posts } = await supabase.from("posts").select("id, title, status_column, due_at, assigned_to_user_id, clients(name)").in("assigned_to_user_id", userIds).not("status_column", "eq", "published").order("due_at", { ascending: true, nullsFirst: false }).limit(20);
      // Group by user
      return (users || []).map((u) => ({
        user: u,
        posts: (posts || []).filter((p) => p.assigned_to_user_id === u.id),
      }));
    },
  });

  const { data: recentRequests = [] } = useQuery({
    queryKey: ["sa-recent-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("id, topic, type, priority, status, created_at, clients(name)").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h2>
        <p className="text-muted-foreground mt-1">Here's your overview across all clients.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{pendingApprovals}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/requests")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Requests</CardTitle>
            <MessageSquarePlus className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{openRequests}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{overduePosts}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-warning">{dueTodayPosts}</div></CardContent>
        </Card>
      </div>

      {/* Team Activity */}
      {teamActivity.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Team Activity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamActivity.map((member: any) => (
              <Card key={member.user.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{member.user.name || member.user.email}</CardTitle>
                  <p className="text-xs text-muted-foreground">{member.posts.length} active post{member.posts.length !== 1 ? "s" : ""}</p>
                </CardHeader>
                <CardContent className="p-0">
                  {member.posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 pb-4">No active assignments</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {member.posts.slice(0, 5).map((post: any) => (
                        <li key={post.id} className="flex items-center justify-between px-6 py-2 hover:bg-accent/50 cursor-pointer" onClick={() => navigate(`/approvals/${post.id}`)}>
                          <div className="flex items-center gap-2 min-w-0">
                            {post.due_at && <span className="text-xs text-muted-foreground">{format(new Date(post.due_at), "MMM d")}</span>}
                            <span className="text-sm truncate">{post.title}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{post.status_column.replace(/_/g, " ")}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Client Requests */}
      {recentRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Recent Client Requests</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/requests")}>View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recentRequests.map((req: any) => (
                  <li key={req.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{req.topic}</p>
                      <p className="text-xs text-muted-foreground">{req.clients?.name} · {format(new Date(req.created_at), "MMM d")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{req.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{req.priority}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/requests")}>
            <FileEdit className="h-5 w-5 text-primary" />
            <span className="font-medium">Create Request for Client</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/approvals")}>
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Review Content</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/admin/clients")}>
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">Manage Clients</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Dashboard ──────────────────────────────────────────────────────────

function TeamDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: myAssignments = [] } = useQuery({
    queryKey: ["team-my-assignments", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, title, status_column, due_at, clients(name)").eq("assigned_to_user_id", profile!.id).not("status_column", "eq", "published").order("due_at", { ascending: true, nullsFirst: false }).limit(10);
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: overduePosts = 0 } = useQuery({
    queryKey: ["team-overdue", profile?.id],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("assigned_to_user_id", profile!.id).lt("due_at", new Date().toISOString()).not("status_column", "eq", "published");
      return count || 0;
    },
    enabled: !!profile,
  });

  const { data: dueTodayPosts = 0 } = useQuery({
    queryKey: ["team-due-today", profile?.id],
    queryFn: async () => {
      const s = new Date(); s.setHours(0,0,0,0);
      const e = new Date(); e.setHours(23,59,59,999);
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("assigned_to_user_id", profile!.id).gte("due_at", s.toISOString()).lte("due_at", e.toISOString()).not("status_column", "eq", "published");
      return count || 0;
    },
    enabled: !!profile,
  });

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["team-pending-approvals"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "client_approval");
      return count || 0;
    },
  });

  const { data: recentRequests = [] } = useQuery({
    queryKey: ["team-recent-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("id, topic, type, priority, status, created_at, clients(name)").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h2>
        <p className="text-muted-foreground mt-1">Your production workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Assignments</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{myAssignments.length}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{overduePosts}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-warning">{dueTodayPosts}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Client Approvals</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{pendingApprovals}</div></CardContent>
        </Card>
      </div>

      {/* My Assignments */}
      {myAssignments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">My Assignments</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {myAssignments.map((post: any) => (
                  <li key={post.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/approvals/${post.id}`)}>
                    <div className="flex items-center gap-3">
                      {post.due_at && <span className="text-sm font-medium text-muted-foreground min-w-[80px]">{format(new Date(post.due_at), "MMM d")}</span>}
                      <span className="text-sm font-medium text-foreground">{post.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{post.status_column.replace(/_/g, " ")}</Badge>
                      {post.clients?.name && <span className="text-xs text-muted-foreground">{post.clients.name}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client Requests */}
      {recentRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Client Requests</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/requests")}>View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recentRequests.map((req: any) => (
                  <li key={req.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{req.topic}</p>
                      <p className="text-xs text-muted-foreground">{req.clients?.name} · {format(new Date(req.created_at), "MMM d")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{req.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{req.priority}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/approvals")}>
            <FileEdit className="h-5 w-5 text-primary" />
            <span className="font-medium">New Post</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1" onClick={() => navigate("/approvals")}>
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Review Content</span>
          </Button>
        </div>
      </div>
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

  const { data: clientPlan } = useQuery({
    queryKey: ["client-plan", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase.from("clients").select("name, plans(name, includes_json)").eq("id", profile.client_id).single();
      return data;
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h2>
        <p className="text-muted-foreground mt-1">Here's what's happening with your social content.</p>
      </div>

      {/* Plan summary */}
      {clientPlan && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/plan")}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-foreground">{(clientPlan as any).plans?.name || "No plan assigned"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/content-library")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Content Library</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">Browse published content</p>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Posts */}
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

      {/* Quick Actions */}
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
    </div>
  );
}

// ─── Main Dashboard (routes to variant) ──────────────────────────────────────

export default function Dashboard() {
  const { isSSAdmin, isSSTeam } = useAuth();

  if (isSSAdmin) return <SuperAdminDashboard />;
  if (isSSTeam) return <TeamDashboard />;
  return <ClientDashboard />;
}
