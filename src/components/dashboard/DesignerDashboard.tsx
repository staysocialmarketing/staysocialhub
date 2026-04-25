import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, startOfWeek } from "date-fns";
import { getWaveEmoji } from "@/lib/waveEmoji";
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TASK_STATUSES = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  waiting: "Waiting", review: "Review", complete: "Complete",
};

const COMPLETED_STATUSES = ["in_progress", "corey_review", "client_approval", "ready_to_schedule", "ready_to_send", "scheduled", "published", "sent"] as const;

function useGreeting(userId?: string): string {
  return useMemo(() => {
    if (!userId) return "Hey";
    const key = `last_dashboard_visit_${userId}`;
    const last = localStorage.getItem(key);
    const now = Date.now();
    if (last && now - parseInt(last, 10) < 24 * 60 * 60 * 1000) return "Welcome back";
    localStorage.setItem(key, String(now));
    return "Hey";
  }, [userId]);
}

function getThumbnail(post: any): string | null {
  if (post.post_images?.length) {
    const sorted = [...post.post_images].sort((a: any, b: any) => a.position - b.position);
    return sorted[0].url;
  }
  return post.creative_url || null;
}

function getPlatforms(post: any): string[] {
  if (!post.platform) return [];
  return post.platform.split(",").map((p: string) => p.trim()).filter(Boolean);
}

export default function DesignerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const greeting = useGreeting(profile?.id);

  // ── Stat: designs in queue ────────────────────────────────────────────────
  const { data: queueCount = 0 } = useQuery({
    queryKey: ["designer-queue-count", profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status_column", "design")
        .eq("assigned_to_user_id", profile!.id);
      return count || 0;
    },
    enabled: !!profile,
  });

  // ── Stat: design fixes in last 30 days ────────────────────────────────────
  const { data: designFixCount = 0 } = useQuery({
    queryKey: ["designer-fix-count", profile?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .ilike("note", "[Design Fix]%")
        .gte("created_at", since);
      return count || 0;
    },
    enabled: !!profile,
  });

  // ── Stat: completed this week ──────────────────────────────────────────────
  const { data: completedCount = 0 } = useQuery({
    queryKey: ["designer-completed-count", profile?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const { data: versions } = await supabase
        .from("post_versions")
        .select("post_id")
        .eq("created_by_user_id", profile!.id)
        .gte("created_at", weekStart);
      if (!versions?.length) return 0;
      const postIds = [...new Set(versions.map((v: any) => v.post_id))];
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("id", postIds)
        .in("status_column", COMPLETED_STATUSES);
      return count || 0;
    },
    enabled: !!profile,
  });

  // ── Stat: overdue ─────────────────────────────────────────────────────────
  const { data: overdueCount = 0 } = useQuery({
    queryKey: ["designer-overdue-count", profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status_column", "design")
        .eq("assigned_to_user_id", profile!.id)
        .lt("due_at", new Date().toISOString());
      return count || 0;
    },
    enabled: !!profile,
  });

  // ── List: design queue ────────────────────────────────────────────────────
  const { data: designQueue = [] } = useQuery({
    queryKey: ["designer-queue", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, platform, due_at, creative_url, content_type, clients(name), post_images(id, url, position)")
        .eq("status_column", "design")
        .eq("assigned_to_user_id", profile!.id)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(20);
      return data || [];
    },
    enabled: !!profile,
  });

  // ── List: recently completed (two-step via post_versions) ─────────────────
  const { data: recentlyCompleted = [] } = useQuery({
    queryKey: ["designer-completed", profile?.id],
    queryFn: async () => {
      const { data: versions } = await supabase
        .from("post_versions")
        .select("post_id, created_at")
        .eq("created_by_user_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!versions?.length) return [];
      const postIds = [...new Set(versions.map((v: any) => v.post_id))];
      const latestByPost: Record<string, string> = {};
      for (const v of versions) {
        if (!latestByPost[v.post_id]) latestByPost[v.post_id] = v.created_at;
      }
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title, platform, status_column, creative_url, clients(name), post_images(id, url, position)")
        .in("id", postIds)
        .in("status_column", COMPLETED_STATUSES);
      if (!posts?.length) return [];
      return posts
        .map((p: any) => ({ ...p, _completedAt: latestByPost[p.id] }))
        .sort((a: any, b: any) => new Date(b._completedAt).getTime() - new Date(a._completedAt).getTime())
        .slice(0, 10);
    },
    enabled: !!profile,
  });

  // ── List: my tasks ─────────────────────────────────────────────────────────
  const { data: myTasks = [] } = useQuery({
    queryKey: ["designer-tasks", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_at, client_id, clients(name)")
        .eq("assigned_to_user_id", profile!.id)
        .not("status", "eq", "complete")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profile,
  });

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["designer-tasks"] });
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {profile?.name
            ? `${greeting}, ${profile.name.split(" ")[0]} ${getWaveEmoji(profile.name)}`
            : "Design Queue"}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your design work for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="In Queue"
          value={queueCount}
          icon={<Palette className="h-4 w-4" />}
          onClick={() => navigate("/workflow")}
        />
        <StatCard
          label="Design Fixes (30d)"
          value={designFixCount}
          icon={<Wrench className="h-4 w-4" />}
        />
        <StatCard
          label="Completed This Week"
          value={completedCount}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="default"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="destructive"
          onClick={() => navigate("/workflow")}
        />
      </div>

      {/* Design Queue */}
      <section>
        <SectionHeader
          title="Design Queue"
          icon={<Palette className="h-5 w-5" />}
          action="View workflow"
          onAction={() => navigate("/workflow")}
        />
        {designQueue.length === 0 ? (
          <EmptyState title="Queue is clear — nothing in design right now" compact />
        ) : (
          <div className="card-elevated divide-y divide-border/40">
            {designQueue.map((post: any) => {
              const thumb = getThumbnail(post);
              const platforms = getPlatforms(post);
              const overdue = post.due_at && isPast(new Date(post.due_at));
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/workflow`)}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    <p className="text-[11px] text-muted-foreground">{post.clients?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {platforms.slice(0, 2).map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-[10px] hidden sm:inline-flex">{p}</Badge>
                    ))}
                    {post.due_at && (
                      <span className={`text-[11px] font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {overdue ? "Overdue · " : ""}{format(new Date(post.due_at), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recently Completed */}
      {recentlyCompleted.length > 0 && (
        <section>
          <SectionHeader title="Recently Completed" icon={<CheckCircle2 className="h-5 w-5" />} />
          <div className="card-elevated divide-y divide-border/40">
            {recentlyCompleted.map((post: any) => {
              const thumb = getThumbnail(post);
              const platforms = getPlatforms(post);
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/approvals/${post.id}`)}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    <p className="text-[11px] text-muted-foreground">{post.clients?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {platforms.slice(0, 2).map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-[10px] hidden sm:inline-flex">{p}</Badge>
                    ))}
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(post._completedAt), "MMM d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My Tasks */}
      <section>
        <SectionHeader
          title="My Tasks"
          icon={<ClipboardList className="h-5 w-5" />}
          action="View all"
          onAction={() => navigate("/team/tasks")}
        />
        {myTasks.length === 0 ? (
          <EmptyState title="No outstanding tasks" compact />
        ) : (
          <div className="card-elevated divide-y divide-border/40">
            {myTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate("/team/tasks")}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    className="shrink-0 h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, "complete"); }}
                  >
                    <CheckCircle2 className="h-3 w-3 text-transparent group-hover:text-muted-foreground/30" />
                  </button>
                  <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                  {task.clients?.name && (
                    <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">{task.clients.name}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {task.due_at && (
                    <span className={`text-[11px] ${isPast(new Date(task.due_at)) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {format(new Date(task.due_at), "MMM d")}
                    </span>
                  )}
                  <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                    <SelectTrigger className="h-7 text-[11px] w-[90px] border-0 bg-muted/50 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{TASK_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
