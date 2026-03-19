import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import FilterBar, { useFilterBar, type FilterConfig } from "@/components/FilterBar";
import { CalendarDays, List, LayoutGrid, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Status mapping ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  internal_review: { label: "Awaiting Internal Review", color: "bg-yellow-500/15 text-yellow-700" },
  corey_review: { label: "Awaiting Corey Review", color: "bg-amber-500/15 text-amber-700" },
  ready_for_client_batch: { label: "Ready for Client Batch", color: "bg-indigo-500/15 text-indigo-700" },
  client_approval: { label: "Awaiting Client Approval", color: "bg-blue-500/15 text-blue-700" },
  scheduled: { label: "Approved / Scheduled", color: "bg-emerald-500/15 text-emerald-700" },
  ready_to_schedule: { label: "Approved / Scheduled", color: "bg-emerald-500/15 text-emerald-700" },
  published: { label: "Published", color: "bg-green-500/15 text-green-700" },
};

const ALL_PIPELINE_STATUSES = [
  "internal_review", "corey_review", "ready_for_client_batch",
  "client_approval", "scheduled", "ready_to_schedule", "published",
];

const CLIENT_VISIBLE_STATUSES = [
  "client_approval", "scheduled", "ready_to_schedule", "published",
];

const ALL_BOARD_COLUMNS = [
  { key: "internal_review", label: "Awaiting Internal Review" },
  { key: "corey_review", label: "Awaiting Corey Review" },
  { key: "ready_for_client_batch", label: "Ready for Client Batch" },
  { key: "client_approval", label: "Awaiting Client Approval" },
  { key: "scheduled", label: "Approved / Scheduled" },
  { key: "published", label: "Published" },
];

const CLIENT_BOARD_COLUMNS = [
  { key: "client_approval", label: "Awaiting Your Approval" },
  { key: "scheduled", label: "Approved / Scheduled" },
  { key: "published", label: "Published" },
];

const platformDotColors: Record<string, string> = {
  instagram: "bg-pink-500",
  facebook: "bg-blue-500",
  linkedin: "bg-sky-500",
  tiktok: "bg-purple-500",
};

const platformBadgeColors: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-700",
  facebook: "bg-blue-500/10 text-blue-700",
  linkedin: "bg-sky-500/10 text-sky-700",
  tiktok: "bg-purple-500/10 text-purple-700",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status];
  if (!s) return <Badge variant="outline" className="text-[10px] border-0">{status}</Badge>;
  return <Badge variant="outline" className={cn("text-[10px] border-0", s.color)}>{s.label}</Badge>;
}

function PlatformBadges({ platform }: { platform: string | null }) {
  if (!platform) return null;
  return (
    <>
      {platform.split(",").map((p) => (
        <Badge key={p} variant="secondary" className={cn("text-[10px] border-0", platformBadgeColors[p.trim().toLowerCase()] || "")}>
          {p.trim()}
        </Badge>
      ))}
    </>
  );
}

function ContentCard({ post, onClick }: { post: any; onClick: () => void }) {
  return (
    <div className="card-elevated overflow-hidden cursor-pointer hover:shadow-lifted transition-all group" onClick={onClick}>
      {post.creative_url ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={post.creative_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="aspect-video bg-muted/30 flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</h4>
        {post.caption && <p className="text-xs text-muted-foreground/60 line-clamp-2">{post.caption}</p>}
        <div className="flex flex-wrap gap-1">
          {post.clients?.name && <Badge variant="secondary" className="text-[10px] border-0">{post.clients.name}</Badge>}
          <PlatformBadges platform={post.platform} />
        </div>
        <div className="flex items-center justify-between">
          <StatusBadge status={post.status_column} />
          {post.scheduled_at && (
            <span className="text-[10px] text-muted-foreground/60">{format(new Date(post.scheduled_at), "MMM d")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View toggle ─────────────────────────────────────────────────────────────

const viewOptions = [
  { value: "calendar", icon: CalendarDays, label: "Calendar" },
  { value: "list", icon: List, label: "List" },
  { value: "board", icon: LayoutGrid, label: "Board" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const { isSSRole } = useAuth();
  const [tab, setTab] = useState("calendar");

  const PIPELINE_STATUSES = isSSRole ? ALL_PIPELINE_STATUSES : CLIENT_VISIBLE_STATUSES;
  const BOARD_COLUMNS = isSSRole ? ALL_BOARD_COLUMNS : CLIENT_BOARD_COLUMNS;

  const { data: posts = [] } = useQuery({
    queryKey: ["marketing-calendar-posts", isSSRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name), assigned_user:assigned_to_user_id(name)")
        .or(`scheduled_at.not.is.null,status_column.in.(${PIPELINE_STATUSES.join(",")})`)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      if (!isSSRole) {
        return (data || []).filter((p: any) =>
          CLIENT_VISIBLE_STATUSES.includes(p.status_column) || p.scheduled_at
        );
      }
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["calendar-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
    enabled: isSSRole,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["calendar-team"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email, user_roles(role)")
        .order("name");
      const ssUsers = (data || []).filter((u: any) =>
        u.user_roles?.some((r: any) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r.role))
      );
      return ssUsers;
    },
    enabled: isSSRole,
  });

  const platforms = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p: any) => p.platform?.split(",").forEach((x: string) => {
      const trimmed = x.trim();
      if (trimmed) set.add(trimmed);
    }));
    return Array.from(set).sort();
  }, [posts]);

  const visibleStatusOptions = useMemo(() => {
    const statusMap = isSSRole ? STATUS_MAP : Object.fromEntries(
      Object.entries(STATUS_MAP).filter(([k]) => CLIENT_VISIBLE_STATUSES.includes(k))
    );
    return Object.entries(statusMap)
      .filter(([k]) => k !== "ready_to_schedule")
      .map(([k, v]) => ({ value: k, label: v.label }));
  }, [isSSRole]);

  const filterConfigs: FilterConfig[] = useMemo(() => {
    const configs: FilterConfig[] = [];
    if (isSSRole) {
      configs.push({ key: "client", label: "Client", options: clients.map((c: any) => ({ value: c.id, label: c.name })) });
    }
    configs.push({ key: "platform", label: "Platform", options: platforms.map((p) => ({ value: p.toLowerCase(), label: p })) });
    configs.push({ key: "status", label: "Status", options: visibleStatusOptions });
    if (isSSRole) {
      configs.push({ key: "assignee", label: "Assignee", options: teamMembers.filter((u: any) => u.id).map((u: any) => ({ value: u.id, label: u.name || u.email || "Unknown" })) });
    }
    return configs;
  }, [isSSRole, clients, platforms, teamMembers, visibleStatusOptions]);

  const { values: filterValues, setValues: setFilterValues } = useFilterBar(filterConfigs, "calendar");

  const filteredPosts = useMemo(() => {
    return posts.filter((post: any) => {
      if (filterValues.client && filterValues.client !== "all" && post.client_id !== filterValues.client) return false;
      if (filterValues.platform && filterValues.platform !== "all") {
        const postPlatforms = (post.platform || "").toLowerCase().split(",").map((s: string) => s.trim());
        if (!postPlatforms.includes(filterValues.platform)) return false;
      }
      if (filterValues.status && filterValues.status !== "all") {
        const statusKey = post.status_column;
        if (filterValues.status === "scheduled" && statusKey !== "scheduled" && statusKey !== "ready_to_schedule") return false;
        if (filterValues.status !== "scheduled" && statusKey !== filterValues.status) return false;
      }
      if (filterValues.assignee && filterValues.assignee !== "all" && post.assigned_to_user_id !== filterValues.assignee) return false;
      return true;
    });
  }, [posts, filterValues]);

  const goToPost = (id: string) => navigate(`/approvals/${id}`);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Marketing Calendar</h1>
          <p className="text-sm text-muted-foreground/70">
            {isSSRole ? "Plan, schedule, and track content across clients" : "View your upcoming and published content"}
          </p>
        </div>
        {/* Pill view toggle */}
        <div className="flex gap-1 bg-muted/40 rounded-full p-1">
          {viewOptions.map((v) => (
            <button
              key={v.value}
              onClick={() => setTab(v.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === v.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <v.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />

      {tab === "calendar" && <CalendarTab posts={filteredPosts} onPostClick={goToPost} />}
      {tab === "list" && <ListTab posts={filteredPosts} onPostClick={goToPost} isSSRole={isSSRole} />}
      {tab === "board" && <BoardTab posts={filteredPosts} onPostClick={goToPost} boardColumns={BOARD_COLUMNS} />}
    </div>
  );
}

// ─── Calendar Tab ────────────────────────────────────────────────────────────

function CalendarTab({ posts, onPostClick }: { posts: any[]; onPostClick: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const postsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    posts.forEach((post) => {
      if (post.scheduled_at) {
        const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(post);
      }
    });
    return map;
  }, [posts]);

  const selectedPosts = selectedDate ? postsByDate[format(selectedDate, "yyyy-MM-dd")] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider py-2">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate[key] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={cn(
                "min-h-[60px] sm:min-h-[80px] rounded-xl p-1.5 cursor-pointer transition-all",
                !isCurrentMonth ? "bg-muted/10 text-muted-foreground/30" : "hover:bg-muted/20",
                isSelected ? "ring-2 ring-primary bg-primary/5" : "",
                isToday ? "ring-1 ring-primary/40" : "",
              )}
              onClick={() => setSelectedDate(day)}
            >
              <span className={cn("text-xs font-medium", isToday && "text-primary font-bold")}>{format(day, "d")}</span>
              <div className="mt-0.5 space-y-0.5 hidden sm:block">
                {dayPosts.slice(0, 3).map((post: any) => (
                  <div
                    key={post.id}
                    className="text-[10px] leading-tight truncate rounded-lg px-1.5 py-0.5 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onPostClick(post.id); }}
                  >
                    {post.title}
                  </div>
                ))}
                {dayPosts.length > 3 && <span className="text-[10px] text-muted-foreground/50">+{dayPosts.length - 3}</span>}
              </div>
              {/* Mobile: platform-colored dot indicators */}
              {dayPosts.length > 0 && (
                <div className="flex gap-0.5 mt-1 sm:hidden justify-center">
                  {dayPosts.slice(0, 4).map((post: any) => {
                    const firstPlatform = (post.platform || "").split(",")[0]?.trim().toLowerCase();
                    const dotColor = platformDotColors[firstPlatform] || "bg-primary";
                    return <div key={post.id} className={cn("h-2 w-2 rounded-full", dotColor)} />;
                  })}
                  {dayPosts.length > 4 && <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-3">
            {format(selectedDate, "EEEE, MMMM d")} — {selectedPosts.length} item{selectedPosts.length !== 1 ? "s" : ""}
          </h4>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground/50">No content scheduled for this day.</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {selectedPosts.map((post: any) => (
                <ContentCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── List Tab ────────────────────────────────────────────────────────────────

function ListTab({ posts, onPostClick, isSSRole }: { posts: any[]; onPostClick: (id: string) => void; isSSRole: boolean }) {
  return (
    <div className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/20 hover:bg-transparent">
            <TableHead className="w-12" />
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Title</TableHead>
            <TableHead className={cn("text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50", isSSRole ? "" : "hidden")}>Client</TableHead>
            <TableHead className="hidden sm:table-cell text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Platform</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Publish Date</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
            <TableHead className={cn("text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50", isSSRole ? "hidden sm:table-cell" : "hidden")}>Assignee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground/50 py-12">No content found</TableCell>
            </TableRow>
          ) : posts.map((post: any) => (
            <TableRow key={post.id} className="cursor-pointer border-border/15 hover:bg-muted/20 transition-colors" onClick={() => onPostClick(post.id)}>
              <TableCell className="py-2">
                {post.creative_url ? (
                  <div className="h-9 w-9 rounded-xl overflow-hidden bg-muted">
                    <img src={post.creative_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium text-foreground max-w-[200px] truncate text-sm">{post.title}</TableCell>
              <TableCell className={cn("text-muted-foreground/70 text-sm", isSSRole ? "" : "hidden")}>{post.clients?.name || "—"}</TableCell>
              <TableCell className="hidden sm:table-cell"><PlatformBadges platform={post.platform} /></TableCell>
              <TableCell className="text-muted-foreground/70 text-sm">{post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, yyyy") : "—"}</TableCell>
              <TableCell><StatusBadge status={post.status_column} /></TableCell>
              <TableCell className={cn("text-muted-foreground/70 text-sm", isSSRole ? "hidden sm:table-cell" : "hidden")}>{(post as any).assigned_user?.name || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Board Tab ───────────────────────────────────────────────────────────────

function BoardTab({ posts, onPostClick, boardColumns }: { posts: any[]; onPostClick: (id: string) => void; boardColumns: typeof ALL_BOARD_COLUMNS }) {
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    boardColumns.forEach((col) => { map[col.key] = []; });
    posts.forEach((post: any) => {
      const status = post.status_column;
      const key = status === "ready_to_schedule" ? "scheduled" : status;
      if (map[key]) map[key].push(post);
    });
    return map;
  }, [posts, boardColumns]);

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4">
      {boardColumns.map((col) => (
        <div key={col.key} className="flex-shrink-0 w-64 sm:w-72 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</h3>
            <span className="text-[10px] font-medium text-muted-foreground/50 bg-muted/50 rounded-full px-1.5 py-0.5">{grouped[col.key]?.length || 0}</span>
          </div>
          <div className="space-y-2.5">
            {(grouped[col.key] || []).map((post: any) => (
              <ContentCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
            ))}
            {(grouped[col.key] || []).length === 0 && (
              <div className="rounded-2xl bg-muted/15 py-10 text-center">
                <p className="text-xs text-muted-foreground/40">No items</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
