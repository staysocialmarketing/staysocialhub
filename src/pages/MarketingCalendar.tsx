import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "@/components/ui/section-header";
import FilterBar, { useFilterBar, type FilterConfig, type FilterOption } from "@/components/FilterBar";
import { CalendarDays, List, LayoutGrid, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Status mapping ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  internal_review: { label: "Awaiting Internal Review", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  corey_review: { label: "Awaiting Corey Review", color: "bg-amber-100 text-amber-800 border-amber-300" },
  ready_for_client_batch: { label: "Ready for Client Batch", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  client_approval: { label: "Awaiting Client Approval", color: "bg-blue-100 text-blue-800 border-blue-300" },
  scheduled: { label: "Approved / Scheduled", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  ready_to_schedule: { label: "Approved / Scheduled", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  published: { label: "Published", color: "bg-green-100 text-green-800 border-green-300" },
};

const PIPELINE_STATUSES = [
  "internal_review", "corey_review", "ready_for_client_batch",
  "client_approval", "scheduled", "ready_to_schedule", "published",
];

const BOARD_COLUMNS = [
  { key: "internal_review", label: "Awaiting Internal Review" },
  { key: "corey_review", label: "Awaiting Corey Review" },
  { key: "ready_for_client_batch", label: "Ready for Client Batch" },
  { key: "client_approval", label: "Awaiting Client Approval" },
  { key: "scheduled", label: "Approved / Scheduled" },
  { key: "published", label: "Published" },
];

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  facebook: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  tiktok: "bg-purple-100 text-purple-800",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status];
  if (!s) return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  return <Badge variant="outline" className={cn("text-[10px]", s.color)}>{s.label}</Badge>;
}

function PlatformBadges({ platform }: { platform: string | null }) {
  if (!platform) return null;
  return (
    <>
      {platform.split(",").map((p) => (
        <Badge key={p} variant="secondary" className={cn("text-[10px]", platformColors[p.trim().toLowerCase()] || "")}>
          {p.trim()}
        </Badge>
      ))}
    </>
  );
}

function ContentCard({ post, onClick }: { post: any; onClick: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-3 space-y-2">
        {post.creative_url ? (
          <div className="aspect-video bg-muted rounded overflow-hidden">
            <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <h4 className="text-sm font-medium text-foreground line-clamp-2">{post.title}</h4>
        {post.caption && <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>}
        <div className="flex flex-wrap gap-1">
          {post.clients?.name && <Badge variant="outline" className="text-[10px]">{post.clients.name}</Badge>}
          <PlatformBadges platform={post.platform} />
        </div>
        <div className="flex items-center justify-between">
          <StatusBadge status={post.status_column} />
          {post.scheduled_at && (
            <span className="text-[10px] text-muted-foreground">{format(new Date(post.scheduled_at), "MMM d")}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("calendar");

  // Fetch posts in pipeline or with scheduled_at
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["marketing-calendar-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name), assigned_user:assigned_to_user_id(name)")
        .or(`scheduled_at.not.is.null,status_column.in.(${PIPELINE_STATUSES.join(",")})`)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch filter options
  const { data: clients = [] } = useQuery({
    queryKey: ["calendar-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
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
  });

  const platforms = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p: any) => p.platform?.split(",").forEach((x: string) => {
      const trimmed = x.trim();
      if (trimmed) set.add(trimmed);
    }));
    return Array.from(set).sort();
  }, [posts]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    { key: "client", label: "Client", options: clients.map((c: any) => ({ value: c.id, label: c.name })) },
    { key: "platform", label: "Platform", options: platforms.map((p) => ({ value: p.toLowerCase(), label: p })) },
    { key: "status", label: "Status", options: Object.entries(STATUS_MAP).filter(([k]) => k !== "ready_to_schedule").map(([k, v]) => ({ value: k, label: v.label })) },
    { key: "assignee", label: "Assignee", options: teamMembers.map((u: any) => ({ value: u.id, label: u.name || u.email })) },
  ], [clients, platforms, teamMembers]);

  const { values: filterValues, setValues: setFilterValues } = useFilterBar(filterConfigs, "calendar");

  const filteredPosts = useMemo(() => {
    return posts.filter((post: any) => {
      if (filterValues.client !== "all" && post.client_id !== filterValues.client) return false;
      if (filterValues.platform !== "all") {
        const postPlatforms = (post.platform || "").toLowerCase().split(",").map((s: string) => s.trim());
        if (!postPlatforms.includes(filterValues.platform)) return false;
      }
      if (filterValues.status !== "all") {
        const statusKey = post.status_column;
        if (filterValues.status === "scheduled" && statusKey !== "scheduled" && statusKey !== "ready_to_schedule") return false;
        if (filterValues.status !== "scheduled" && statusKey !== filterValues.status) return false;
      }
      if (filterValues.assignee !== "all" && post.assigned_to_user_id !== filterValues.assignee) return false;
      return true;
    });
  }, [posts, filterValues]);

  const goToPost = (id: string) => navigate(`/approvals/${id}`);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Marketing Calendar</h1>
        <p className="text-sm text-muted-foreground">Plan, schedule, and track content across clients</p>
      </div>

      <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Calendar</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" />List</TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Board</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <CalendarTab posts={filteredPosts} onPostClick={goToPost} />
        </TabsContent>
        <TabsContent value="list">
          <ListTab posts={filteredPosts} onPostClick={goToPost} />
        </TabsContent>
        <TabsContent value="board">
          <BoardTab posts={filteredPosts} onPostClick={goToPost} />
        </TabsContent>
      </Tabs>
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
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
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
                "min-h-[80px] border rounded-md p-1 cursor-pointer transition-colors",
                !isCurrentMonth ? "bg-muted/30 text-muted-foreground/50" : "bg-card",
                isSelected ? "ring-2 ring-primary" : "",
                isToday ? "border-primary" : "border-border",
                "hover:bg-accent/50"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <span className={cn("text-xs font-medium", isToday && "text-primary font-bold")}>{format(day, "d")}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map((post: any) => (
                  <div
                    key={post.id}
                    className="text-[10px] leading-tight truncate rounded px-1 py-0.5 bg-primary/10 text-primary cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onPostClick(post.id); }}
                  >
                    {post.title}
                  </div>
                ))}
                {dayPosts.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {format(selectedDate, "EEEE, MMMM d")} — {selectedPosts.length} item{selectedPosts.length !== 1 ? "s" : ""}
          </h4>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No content scheduled for this day.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

function ListTab({ posts, onPostClick }: { posts: any[]; onPostClick: (id: string) => void }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Publish Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No content found</TableCell>
            </TableRow>
          ) : posts.map((post: any) => (
            <TableRow key={post.id} className="cursor-pointer" onClick={() => onPostClick(post.id)}>
              <TableCell>
                {post.creative_url ? (
                  <div className="h-8 w-8 rounded overflow-hidden bg-muted">
                    <img src={post.creative_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium text-foreground max-w-[200px] truncate">{post.title}</TableCell>
              <TableCell className="text-muted-foreground">{post.clients?.name || "—"}</TableCell>
              <TableCell><PlatformBadges platform={post.platform} /></TableCell>
              <TableCell className="text-muted-foreground">{post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, yyyy") : "—"}</TableCell>
              <TableCell><StatusBadge status={post.status_column} /></TableCell>
              <TableCell className="text-muted-foreground">{(post as any).assigned_user?.name || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Board Tab ───────────────────────────────────────────────────────────────

function BoardTab({ posts, onPostClick }: { posts: any[]; onPostClick: (id: string) => void }) {
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    BOARD_COLUMNS.forEach((col) => { map[col.key] = []; });
    posts.forEach((post: any) => {
      const status = post.status_column;
      // Merge ready_to_schedule into scheduled column
      const key = status === "ready_to_schedule" ? "scheduled" : status;
      if (map[key]) map[key].push(post);
    });
    return map;
  }, [posts]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((col) => (
        <div key={col.key} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
            <Badge variant="secondary" className="text-[10px]">{grouped[col.key]?.length || 0}</Badge>
          </div>
          <div className="space-y-3">
            {(grouped[col.key] || []).map((post: any) => (
              <ContentCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
            ))}
            {(grouped[col.key] || []).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No items</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
