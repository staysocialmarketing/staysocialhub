import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, startOfMonth, subWeeks } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { getWaveEmoji } from "@/lib/waveEmoji";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  Eye,
  FileEdit,
  Globe,
  Inbox,
  MessageSquarePlus,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

// ─── Status pipeline config ───────────────────────────────────────────────────

const PIPELINE_GROUPS = [
  { label: "AI Draft",    statuses: ["ai_draft"],                              color: "bg-violet-500/10 text-violet-600" },
  { label: "In Progress", statuses: ["new_requests","idea","in_progress","writing","design"], color: "bg-blue-500/10 text-blue-600" },
  { label: "Review",      statuses: ["internal_review","corey_review"],        color: "bg-amber-500/10 text-amber-600" },
  { label: "Client",      statuses: ["client_approval","ready_for_client_batch"], color: "bg-orange-500/10 text-orange-600" },
  { label: "Scheduled",   statuses: ["scheduled","ready_to_schedule","approved"], color: "bg-emerald-500/10 text-emerald-600" },
  { label: "Published",   statuses: ["published","sent","complete"],           color: "bg-primary/10 text-primary" },
] as const;

function useGreeting(userId?: string): string {
  const key = `last_dashboard_visit_${userId}`;
  const last = localStorage.getItem(key);
  const now = Date.now();
  const isReturn = last && now - parseInt(last, 10) < 24 * 60 * 60 * 1000;
  if (!isReturn) localStorage.setItem(key, String(now));
  return isReturn ? "Welcome back" : "Hey";
}

// ─── Pipeline widget ──────────────────────────────────────────────────────────

function PostPipeline() {
  const navigate = useNavigate();

  const { data: statusCounts = {} } = useQuery({
    queryKey: ["admin-post-pipeline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("status_column")
        .not("status_column", "in", '("published","sent","complete")');

      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.status_column] = (counts[p.status_column] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 60_000,
  });

  const total = Object.values(statusCounts).reduce((s, n) => s + n, 0);

  return (
    <section>
      <SectionHeader
        title="Posts in Workflow"
        icon={<Workflow className="h-5 w-5" />}
        action="Open Workflow"
        onAction={() => navigate("/workflow")}
      />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PIPELINE_GROUPS.map((group) => {
          const count = group.statuses.reduce((s, st) => s + (statusCounts[st] || 0), 0);
          return (
            <button
              key={group.label}
              onClick={() => navigate("/workflow")}
              className="card-elevated p-4 text-center hover:shadow-lifted transition-all group"
            >
              <div className={`text-2xl font-bold ${count > 0 ? group.color.split(" ")[1] : "text-muted-foreground/40"}`}>
                {count}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium mt-1 leading-tight">
                {group.label}
              </div>
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {total} active post{total !== 1 ? "s" : ""} in progress
        </p>
      )}
    </section>
  );
}

// ─── Corey Review queue ───────────────────────────────────────────────────────

function CoreyReviewQueue() {
  const navigate = useNavigate();

  const { data: posts = [] } = useQuery({
    queryKey: ["admin-corey-review"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, platform, content_type, created_at, client_id, clients(name)")
        .eq("status_column", "corey_review")
        .order("created_at", { ascending: true })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  return (
    <section>
      <SectionHeader
        title="Pending Your Review"
        icon={<Eye className="h-5 w-5" />}
        action={posts.length > 0 ? "View all" : undefined}
        onAction={() => navigate("/approvals")}
      />
      {posts.length === 0 ? (
        <EmptyState title="Nothing waiting for your review" compact />
      ) : (
        <div className="card-elevated divide-y divide-border/40">
          {posts.map((post: any) => (
            <div
              key={post.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate("/approvals")}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
                {post.clients?.name && (
                  <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                    {post.clients.name}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-3">
                {format(new Date(post.created_at), "MMM d")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Cross-client activity ────────────────────────────────────────────────────

function AllClientActivity() {
  const navigate = useNavigate();

  const { data: activities = [] } = useQuery({
    queryKey: ["admin-all-client-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_activity")
        .select("id, title, activity_type, created_at, client_id, clients(name)")
        .order("created_at", { ascending: false })
        .limit(12);
      return (data || []) as Array<{
        id: string;
        title: string;
        activity_type: string;
        created_at: string;
        client_id: string;
        clients: { name: string } | null;
      }>;
    },
    refetchInterval: 60_000,
  });

  const TYPE_ICON: Record<string, string> = {
    ai_draft_generated: "✨",
    internal_review_completed: "👀",
    corey_review: "🔍",
    approval_completed: "✅",
    batch_ready: "📦",
    content_scheduled: "📅",
    content_published: "🚀",
    email_sent: "📬",
    request_status_changed: "↪️",
  };

  return (
    <section>
      <SectionHeader
        title="Client Activity"
        icon={<Activity className="h-5 w-5" />}
        action="All clients"
        onAction={() => navigate("/admin/clients")}
      />
      {activities.length === 0 ? (
        <EmptyState title="No recent activity" compact />
      ) : (
        <div className="card-elevated divide-y divide-border/40">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-base shrink-0">{TYPE_ICON[a.activity_type] || "•"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{a.title}</p>
                {a.clients?.name && (
                  <p className="text-[11px] text-muted-foreground">{a.clients.name}</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {format(new Date(a.created_at), "MMM d")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Analytics widget ─────────────────────────────────────────────────────────

function PublishingAnalytics() {
  const navigate = useNavigate();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();

  const { data: thisWeek = 0 } = useQuery({
    queryKey: ["admin-analytics-week"],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("status_column", ["published", "sent"])
        .gte("created_at", weekStart);
      return count || 0;
    },
  });

  const { data: lastWeek = 0 } = useQuery({
    queryKey: ["admin-analytics-lastweek"],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("status_column", ["published", "sent"])
        .gte("created_at", lastWeekStart)
        .lt("created_at", weekStart);
      return count || 0;
    },
  });

  const { data: thisMonth = 0 } = useQuery({
    queryKey: ["admin-analytics-month"],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("status_column", ["published", "sent"])
        .gte("created_at", monthStart);
      return count || 0;
    },
  });

  const { data: activeClients = 0 } = useQuery({
    queryKey: ["admin-active-clients"],
    queryFn: async () => {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return count || 0;
    },
  });

  const weekDelta = thisWeek - lastWeek;

  return (
    <section>
      <SectionHeader title="Analytics" icon={<BarChart3 className="h-5 w-5" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Published This Week"
          value={thisWeek}
          subtitle={weekDelta === 0 ? "Same as last week" : weekDelta > 0 ? `+${weekDelta} vs last week` : `${weekDelta} vs last week`}
          icon={<Zap className="h-4 w-4" />}
          onClick={() => navigate("/workflow")}
        />
        <StatCard
          label="Published This Month"
          value={thisMonth}
          icon={<BarChart3 className="h-4 w-4" />}
          onClick={() => navigate("/workflow")}
        />
        <StatCard
          label="Active Clients"
          value={activeClients}
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate("/admin/clients")}
        />
        <StatCard
          label="Last Week"
          value={lastWeek}
          icon={<FileEdit className="h-4 w-4" />}
          onClick={() => navigate("/workflow")}
        />
      </div>
    </section>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

function QuickLinks() {
  const navigate = useNavigate();

  const links = [
    { label: "Workflow",      icon: <Workflow className="h-5 w-5 text-primary" />,          path: "/workflow" },
    { label: "Approvals",     icon: <CheckSquare className="h-5 w-5 text-primary" />,       path: "/approvals" },
    { label: "Requests",      icon: <MessageSquarePlus className="h-5 w-5 text-primary" />, path: "/requests" },
    { label: "Team Tasks",    icon: <ClipboardList className="h-5 w-5 text-primary" />,     path: "/team/tasks" },
    { label: "Clients",       icon: <Users className="h-5 w-5 text-primary" />,             path: "/admin/clients" },
    { label: "Inbox",         icon: <Inbox className="h-5 w-5 text-primary" />,             path: "/team/inbox" },
    { label: "Calendar",      icon: <Globe className="h-5 w-5 text-primary" />,             path: "/calendar" },
    { label: "Think Tank",    icon: <Sparkles className="h-5 w-5 text-primary" />,          path: "/team/think-tank" },
  ];

  return (
    <section>
      <SectionHeader title="Quick Links" icon={<ExternalLink className="h-5 w-5" />} />
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            className="card-elevated p-3 flex flex-col items-center gap-1.5 hover:shadow-lifted transition-all group"
          >
            <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
            <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
              {link.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── SS Admin Dashboard ───────────────────────────────────────────────────────

export function SSAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const greeting = useGreeting(profile?.id);

  // Summary stats
  const { data: coreyReviewCount = 0 } = useQuery({
    queryKey: ["admin-stat-corey-review"],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status_column", "corey_review");
      return count || 0;
    },
    refetchInterval: 30_000,
  });

  const { data: clientApprovalCount = 0 } = useQuery({
    queryKey: ["admin-stat-client-approval"],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("status_column", ["client_approval", "ready_for_client_batch"]);
      return count || 0;
    },
    refetchInterval: 30_000,
  });

  const { data: openRequestsCount = 0 } = useQuery({
    queryKey: ["admin-stat-requests"],
    queryFn: async () => {
      const { count } = await supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      return count || 0;
    },
    refetchInterval: 60_000,
  });

  const { data: overdueCount = 0 } = useQuery({
    queryKey: ["admin-stat-overdue"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .lt("due_at", now)
        .not("status", "eq", "complete");
      return count || 0;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {profile?.name
            ? `${greeting}, ${profile.name.split(" ")[0]} ${getWaveEmoji(profile.name)}`
            : "Admin Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">Your full platform overview.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Needs Your Review"
          value={coreyReviewCount}
          icon={<Eye className="h-4 w-4" />}
          accent={coreyReviewCount > 0 ? "default" : "default"}
          onClick={() => navigate("/approvals")}
        />
        <StatCard
          label="With Client"
          value={clientApprovalCount}
          icon={<CheckSquare className="h-4 w-4" />}
          onClick={() => navigate("/approvals")}
        />
        <StatCard
          label="Open Requests"
          value={openRequestsCount}
          icon={<MessageSquarePlus className="h-4 w-4" />}
          onClick={() => navigate("/requests")}
        />
        <StatCard
          label="Overdue Tasks"
          value={overdueCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={overdueCount > 0 ? "destructive" : "default"}
          onClick={() => navigate("/team/tasks?filter=overdue")}
        />
      </div>

      <QuickLinks />
      <PostPipeline />
      <CoreyReviewQueue />
      <PublishingAnalytics />
      <AllClientActivity />
    </div>
  );
}
