import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, startOfMonth, subWeeks } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getWaveEmoji } from "@/lib/waveEmoji";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Eye, MessageSquarePlus, Workflow } from "lucide-react";

/**
 * Admin dashboard (Corey, Oct 7 2026): the same calm shape as the client dashboard.
 * What needs you today, with the items themselves. One pipeline strip. A quiet numbers line.
 * Then client activity. No quick links: the menu already is one.
 */

const PIPELINE_GROUPS = [
  { label: "New",      statuses: ["idea"],                              tone: "text-slate-600" },
  { label: "AI draft", statuses: ["ai_draft"],                          tone: "text-violet-600" },
  { label: "Design",   statuses: ["design"],                            tone: "text-fuchsia-600" },
  { label: "In process", statuses: ["in_progress"],                     tone: "text-blue-600" },
  { label: "Your review", statuses: ["corey_review"],                   tone: "text-amber-600" },
  { label: "With client", statuses: ["client_approval", "ready_for_client_batch"], tone: "text-orange-600" },
  { label: "Ready",    statuses: ["ready_to_schedule", "ready_to_send"], tone: "text-emerald-600" },
] as const;

function useGreeting(userId?: string): string {
  const key = `last_dashboard_visit_${userId}`;
  const last = localStorage.getItem(key);
  const now = Date.now();
  const isReturn = last && now - parseInt(last, 10) < 24 * 60 * 60 * 1000;
  if (!isReturn) localStorage.setItem(key, String(now));
  return isReturn ? "Welcome back" : "Hey";
}

type Row = { id: string; title: string; sub?: string | null; when?: string | null };

/** One "needs you" card: a count, the first few items, and where to go. */
function NeedsCard({ title, icon, count, items, emptyText, to, tone = "default" }: {
  title: string; icon: React.ReactNode; count: number; items: Row[]; emptyText: string; to: string; tone?: "default" | "warn";
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn("card-elevated p-5 text-left flex flex-col gap-3 hover:shadow-lifted transition-all min-h-[11rem]", tone === "warn" && count > 0 && "ring-1 ring-destructive/30")}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</span>
        <span className={cn("text-2xl font-bold tabular-nums", count === 0 ? "text-muted-foreground/40" : tone === "warn" ? "text-destructive" : "text-primary")}>{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 3).map((r) => (
            <li key={r.id} className="flex items-baseline gap-2 text-sm min-w-0">
              <span className="truncate text-foreground">{r.title}</span>
              {r.sub && <span className="text-[11px] text-muted-foreground shrink-0">{r.sub}</span>}
            </li>
          ))}
          {count > 3 && <li className="text-[11px] text-muted-foreground">and {count - 3} more</li>}
        </ul>
      )}
    </button>
  );
}

export function SSAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const greeting = useGreeting(profile?.id);
  const now = new Date();

  // ── What needs you ──
  const { data: review = [] } = useQuery({
    queryKey: ["admin-corey-review"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts").select("id, title, created_at, clients(name)")
        .eq("status_column", "corey_review").order("created_at", { ascending: true }).limit(50);
      return (data || []).map((p: any) => ({ id: p.id, title: p.title, sub: p.clients?.name ?? null })) as Row[];
    },
    refetchInterval: 30_000,
  });
  const { data: overdue = [] } = useQuery({
    queryKey: ["admin-overdue-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks").select("id, title, due_at, clients(name)")
        .lt("due_at", now.toISOString()).not("status", "eq", "complete").order("due_at", { ascending: true }).limit(50);
      return (data || []).map((t: any) => ({ id: t.id, title: t.title, sub: t.clients?.name ?? (t.due_at ? format(new Date(t.due_at), "MMM d") : null) })) as Row[];
    },
    refetchInterval: 60_000,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-open-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts").select("id, title, created_at, clients(name)")
        .eq("source", "client_request").eq("status_column", "idea").order("created_at", { ascending: true }).limit(50);
      return (data || []).map((p: any) => ({ id: p.id, title: p.title, sub: p.clients?.name ?? null })) as Row[];
    },
    refetchInterval: 60_000,
  });

  // ── Pipeline ──
  const { data: statusCounts = {} } = useQuery({
    queryKey: ["admin-post-pipeline"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("status_column").not("status_column", "in", '("published","sent","complete")');
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => { counts[p.status_column] = (counts[p.status_column] || 0) + 1; });
      return counts;
    },
    refetchInterval: 60_000,
  });
  const pipeline = PIPELINE_GROUPS.map((g) => ({ ...g, count: g.statuses.reduce((s, st) => s + (statusCounts[st] || 0), 0) }));
  const active = pipeline.reduce((s, g) => s + g.count, 0);
  const withClient = pipeline.find((g) => g.label === "With client")?.count ?? 0;

  // ── Numbers ──
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const countPublished = async (from: string, to?: string) => {
    let q = supabase.from("posts").select("id", { count: "exact", head: true }).in("status_column", ["published", "sent"]).gte("updated_at", from);
    if (to) q = q.lt("updated_at", to);
    const { count } = await q;
    return count || 0;
  };
  const { data: thisWeek = 0 } = useQuery({ queryKey: ["admin-analytics-week"], queryFn: () => countPublished(weekStart) });
  const { data: lastWeek = 0 } = useQuery({ queryKey: ["admin-analytics-lastweek"], queryFn: () => countPublished(lastWeekStart, weekStart) });
  const { data: thisMonth = 0 } = useQuery({ queryKey: ["admin-analytics-month"], queryFn: () => countPublished(monthStart) });
  const { data: activeClients = 0 } = useQuery({
    queryKey: ["admin-active-clients"],
    queryFn: async () => { const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"); return count || 0; },
  });

  // ── Activity ──
  const { data: activities = [] } = useQuery({
    queryKey: ["admin-all-client-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("client_activity").select("id, title, activity_type, created_at, clients(name)").order("created_at", { ascending: false }).limit(8);
      return (data || []) as Array<{ id: string; title: string; activity_type: string; created_at: string; clients: { name: string } | null }>;
    },
    refetchInterval: 60_000,
  });
  const TYPE_ICON: Record<string, string> = {
    ai_draft_generated: "✨", internal_review_completed: "👀", corey_review: "🔍", approval_completed: "✅",
    batch_ready: "📦", content_scheduled: "📅", content_published: "🚀", email_sent: "📬", request_status_changed: "↪️",
  };

  const needsCount = review.length + overdue.length + requests.length;
  const weekDelta = thisWeek - lastWeek;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {profile?.name ? `${greeting}, ${profile.name.split(" ")[0]} ${getWaveEmoji(profile.name)}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(now, "EEEE, MMMM d")}.{" "}
          {needsCount === 0 ? "Nothing is waiting on you." : `${needsCount} thing${needsCount === 1 ? "" : "s"} need${needsCount === 1 ? "s" : ""} you today.`}
        </p>
      </div>

      {/* What needs you */}
      <section className="grid gap-3 md:grid-cols-3">
        <NeedsCard title="Your review" icon={<Eye className="h-4 w-4 text-primary" />} count={review.length} items={review} emptyText="Nothing waiting for your review." to="/approvals" />
        <NeedsCard title="Overdue tasks" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} count={overdue.length} items={overdue} emptyText="No task is overdue." to="/team/tasks?filter=overdue" tone="warn" />
        <NeedsCard title="Open requests" icon={<MessageSquarePlus className="h-4 w-4 text-primary" />} count={requests.length} items={requests} emptyText="No client requests waiting." to="/requests" />
      </section>

      {/* Pipeline strip */}
      <section>
        <SectionHeader title="Posts in workflow" icon={<Workflow className="h-5 w-5" />} action="Open Workflow" onAction={() => navigate("/workflow")} />
        <button type="button" onClick={() => navigate("/workflow")} className="card-elevated w-full px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 hover:shadow-lifted transition-all text-left">
          {pipeline.map((g) => (
            <span key={g.label} className="flex items-baseline gap-1.5 text-sm">
              <span className={cn("font-bold tabular-nums", g.count > 0 ? g.tone : "text-muted-foreground/40")}>{g.count}</span>
              <span className="text-muted-foreground text-xs">{g.label}</span>
            </span>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{active} active · {withClient} with clients</span>
        </button>
      </section>

      {/* Numbers */}
      <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span><strong className="text-foreground tabular-nums">{thisWeek}</strong> published this week{weekDelta !== 0 && <span className={weekDelta > 0 ? " text-primary" : " text-destructive"}> ({weekDelta > 0 ? "+" : ""}{weekDelta} vs last week)</span>}</span>
        <span><strong className="text-foreground tabular-nums">{thisMonth}</strong> this month</span>
        <button type="button" onClick={() => navigate("/admin/clients")} className="hover:text-foreground"><strong className="text-foreground tabular-nums">{activeClients}</strong> active clients</button>
      </section>

      {/* Activity */}
      <section>
        <SectionHeader title="Client activity" icon={<Activity className="h-5 w-5" />} action="All clients" onAction={() => navigate("/admin/clients")} />
        {activities.length === 0 ? (
          <EmptyState title="No recent activity" compact />
        ) : (
          <div className="card-elevated divide-y divide-border/40">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base shrink-0">{TYPE_ICON[a.activity_type] || "•"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{a.title}</p>
                  {a.clients?.name && <p className="text-[11px] text-muted-foreground">{a.clients.name}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{format(new Date(a.created_at), "MMM d")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
