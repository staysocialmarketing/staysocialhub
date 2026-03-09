import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare, Calendar, Image as ImageIcon, Plus, Clock, FileText, Film, LayoutGrid, Play, Mail, Send, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import type { Database } from "@/integrations/supabase/types";
import WorkflowCardDialog from "@/components/WorkflowCardDialog";
import ApprovalActions from "@/components/ApprovalActions";
import { CONTENT_TYPE_OPTIONS, AUDIENCE_OPTIONS } from "@/lib/workflowUtils";
import FilterBar, { useFilterBar, applyDueDateFilter, PRIORITY_FILTER_OPTIONS, DUE_DATE_FILTER_OPTIONS } from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";
import { useClientFilter } from "@/contexts/ClientFilterContext";

type PostStatus = Database["public"]["Enums"]["post_status"];

const PRIMARY_COLUMNS: { key: PostStatus; label: string }[] = [
  { key: "idea", label: "New" },
  { key: "in_progress" as PostStatus, label: "In Progress" },
  { key: "internal_review", label: "Internal Review" },
];

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  facebook: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  tiktok: "bg-purple-100 text-purple-800",
};

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "TikTok"];

const contentTypeConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  image: { icon: <ImageIcon className="h-3 w-3" />, label: "Image", className: "bg-emerald-100 text-emerald-800" },
  video: { icon: <Film className="h-3 w-3" />, label: "Video", className: "bg-violet-100 text-violet-800" },
  reel: { icon: <Play className="h-3 w-3" />, label: "Reel", className: "bg-rose-100 text-rose-800" },
  carousel: { icon: <LayoutGrid className="h-3 w-3" />, label: "Carousel", className: "bg-amber-100 text-amber-800" },
  email_campaign: { icon: <Mail className="h-3 w-3" />, label: "Email", className: "bg-blue-100 text-blue-800" },
  ad_creative: { icon: <ImageIcon className="h-3 w-3" />, label: "Ad Creative", className: "bg-teal-100 text-teal-800" },
  landing_page: { icon: <FileText className="h-3 w-3" />, label: "Landing Page", className: "bg-indigo-100 text-indigo-800" },
  graphic_design: { icon: <ImageIcon className="h-3 w-3" />, label: "Design", className: "bg-fuchsia-100 text-fuchsia-800" },
  website_update: { icon: <FileText className="h-3 w-3" />, label: "Website", className: "bg-cyan-100 text-cyan-800" },
  general_task: { icon: <CheckCircle2 className="h-3 w-3" />, label: "Task", className: "bg-gray-100 text-gray-800" },
};

function getDueDateColor(dueAt: string | null) {
  if (!dueAt) return null;
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(new Date());
  if (due < today) return "text-destructive";
  if (isToday(due)) return "text-warning";
  return "text-muted-foreground";
}

function UserInitials({ name, className }: { name: string | null; className?: string }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary", className)}>
      {initials}
    </div>
  );
}


export default function Workflow() {
  const { profile, isSSAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  // FilterBar setup
  const { data: allClients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { selectedClientId: globalClientId } = useClientFilter();

  

  const [newPost, setNewPost] = useState({
    client_id: "",
    title: "",
    content_type: "",
    platforms: [] as string[],
    caption: "",
    hashtags: "",
    internal_notes: "",
    scheduled_at: null as Date | null,
    assigned_to_user_id: "",
    reviewer_user_id: "",
    due_at: null as Date | null,
    // Email fields
    subject_line: "",
    preview_text: "",
    email_body: "",
    audience: "",
  });
  const [creativeFile, setCreativeFile] = useState<File | null>(null);

  const ALL_STATUSES: PostStatus[] = PRIMARY_COLUMNS.map(c => c.key);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["workflow-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), assigned_user:assigned_to_user_id(name), reviewer:reviewer_user_id(name), clients(name)")
        .in("status_column", ALL_STATUSES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  // clients query is already above in filterConfigs
  const clients = allClients;

  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, users:user_id(id, name, email)")
        .in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter((r: any) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      }).map((r: any) => r.users);
    },
  });

  const filterConfigs: FilterConfig[] = [
    { key: "client", label: "Client", options: allClients.map((c: any) => ({ value: c.id, label: c.name })) },
    { key: "contentType", label: "Type", options: CONTENT_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })) },
    { key: "assignee", label: "Assigned To", options: ssUsers.map((u: any) => ({ value: u.id, label: u.name || u.email })) },
    { key: "priority", label: "Priority", options: PRIORITY_FILTER_OPTIONS },
    { key: "dueDate", label: "Due Date", options: DUE_DATE_FILTER_OPTIONS },
  ];
  const { values: filterValues, setValues: setFilterValues } = useFilterBar(filterConfigs, "workflow");

  const isEmailType = newPost.content_type === "email_campaign";

  const createPost = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      let creative_url: string | null = null;
      if (creativeFile) {
        const compressed = await compressImage(creativeFile);
        const ext = compressed.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("creative-assets").upload(path, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
        creative_url = urlData.publicUrl;
      }
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          client_id: newPost.client_id,
          title: newPost.title,
          content_type: newPost.content_type || null,
          platform: isEmailType ? null : (newPost.platforms.join(", ") || null),
          caption: isEmailType ? null : (newPost.caption || null),
          hashtags: isEmailType ? null : (newPost.hashtags || null),
          creative_url,
          scheduled_at: newPost.scheduled_at?.toISOString() || null,
          status_column: "idea" as PostStatus,
          created_by_user_id: profile.id,
          internal_notes: newPost.internal_notes || null,
          assigned_to_user_id: newPost.assigned_to_user_id || null,
          reviewer_user_id: newPost.reviewer_user_id || null,
          due_at: newPost.due_at?.toISOString() || null,
          subject_line: isEmailType ? (newPost.subject_line || null) : null,
          preview_text: isEmailType ? (newPost.preview_text || null) : null,
          email_body: isEmailType ? (newPost.email_body || null) : null,
          audience: isEmailType ? (newPost.audience || null) : null,
        } as any)
        .select()
        .single();
      if (postError) throw postError;
      await supabase.from("post_versions").insert({
        post_id: postData.id,
        version_number: 1,
        creative_url,
        caption: isEmailType ? null : (newPost.caption || null),
        hashtags: isEmailType ? null : (newPost.hashtags || null),
        created_by_user_id: profile.id,
      });
      return postData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post created!");
      setCreateOpen(false);
      setNewPost({ client_id: "", title: "", content_type: "", platforms: [], caption: "", hashtags: "", internal_notes: "", scheduled_at: null, assigned_to_user_id: "", reviewer_user_id: "", due_at: null, subject_line: "", preview_text: "", email_body: "", audience: "" });
      setCreativeFile(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });

  const movePost = useMutation({
    mutationFn: async ({ postId, newStatus }: { postId: string; newStatus: PostStatus }) => {
      const { error } = await supabase.from("posts").update({ status_column: newStatus } as any).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post moved");
    },
    onError: () => toast.error("Failed to move post"),
  });

  const sendNow = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").update({
        status_column: "sent" as any,
        send_date: new Date().toISOString(),
      } as any).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Campaign sent!");
    },
    onError: () => toast.error("Failed to send"),
  });

  const handleDragStart = (e: React.DragEvent, postId: string, currentStatus: PostStatus) => {
    e.dataTransfer.setData("postId", postId);
    e.dataTransfer.setData("fromStatus", currentStatus);
  };

  const handleDrop = (e: React.DragEvent, toStatus: PostStatus) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    const fromStatus = e.dataTransfer.getData("fromStatus") as PostStatus;
    if (fromStatus === toStatus) return;
    movePost.mutate({ postId, newStatus: toStatus });
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const togglePlatform = (p: string) => {
    setNewPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
    }));
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><p className="text-muted-foreground">Loading workflow board...</p></div>;
  }

  const renderCard = (post: any) => {
    const dueDateColor = getDueDateColor(post.due_at);
    const ct = post.content_type ? contentTypeConfig[post.content_type] : null;
    const showApprovalActions = isSSAdmin && post.status_column === "internal_review";
    const showSendActions = isSSAdmin && post.status_column === "ready_to_send";

    return (
      <div key={post.id} className="space-y-1.5">
        <div
          className="card-elevated p-4 space-y-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
          draggable
          onDragStart={(e) => handleDragStart(e, post.id, post.status_column)}
          onClick={() => setSelectedPost(post)}
        >
          {post.creative_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {!post.creative_url && ct && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {ct.icon}
              <span className="text-[11px]">{ct.label}</span>
            </div>
          )}
          <h4 className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</h4>
          {post.content_type === "email_campaign" && post.subject_line && (
            <p className="text-xs text-muted-foreground/70 line-clamp-1">Subject: {post.subject_line}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {post.clients?.name && <Badge variant="outline" className="text-[11px]">{post.clients.name}</Badge>}
            {post.request_id && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <FileText className="h-2.5 w-2.5" />Request
              </Badge>
            )}
          </div>
          {post.platform && (
            <div className="flex flex-wrap gap-1">
              {post.platform.split(",").map((p: string) => (
                <Badge key={p} variant="secondary" className={`text-[11px] ${platformColors[p.trim().toLowerCase()] || ""}`}>{p.trim()}</Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {post.due_at && (
                <span className={cn("flex items-center gap-1", dueDateColor)}>
                  <Clock className="h-3 w-3" />{format(new Date(post.due_at), "MMM d")}
                </span>
              )}
              {post.scheduled_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{new Date(post.scheduled_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {(post.comments?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />{post.comments.length}
              </span>
            )}
          </div>
          {post.assigned_user?.name && (
            <div className="flex items-center gap-1.5 pt-2">
              <UserInitials name={post.assigned_user.name} />
              <span className="text-[11px] text-muted-foreground truncate">{post.assigned_user.name}</span>
            </div>
          )}
        </div>
        {showApprovalActions && (
          <ApprovalActions
            postId={post.id}
            postTitle={post.title}
            currentStatus={post.status_column}
            contentType={post.content_type}
          />
        )}
        {showSendActions && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); sendNow.mutate(post.id); }}>
              <Send className="h-3.5 w-3.5" />Send Now
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); movePost.mutate({ postId: post.id, newStatus: "scheduled" as PostStatus }); }}>
              <Calendar className="h-3.5 w-3.5" />Schedule
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Workflow</h1>
          <p className="text-sm text-muted-foreground">Production pipeline — drag cards or use action buttons</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Post</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Client</Label>
                  <Select value={newPost.client_id} onValueChange={(v) => setNewPost({ ...newPost, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Post Title</Label><Input value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} placeholder="Post title" /></div>
                <div>
                  <Label>Content Type</Label>
                  <Select value={newPost.content_type} onValueChange={(v) => setNewPost({ ...newPost, content_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isEmailType ? (
                  /* Email-specific fields */
                  <>
                    <div><Label>Subject Line</Label><Input value={newPost.subject_line} onChange={e => setNewPost({ ...newPost, subject_line: e.target.value })} placeholder="Email subject line" /></div>
                    <div><Label>Preview Text</Label><Input value={newPost.preview_text} onChange={e => setNewPost({ ...newPost, preview_text: e.target.value })} placeholder="Preview text shown in inbox" /></div>
                    <div><Label>Email Body</Label><Textarea value={newPost.email_body} onChange={e => setNewPost({ ...newPost, email_body: e.target.value })} placeholder="Email content..." rows={4} /></div>
                    <div>
                      <Label>Audience</Label>
                      <Select value={newPost.audience} onValueChange={(v) => setNewPost({ ...newPost, audience: v })}>
                        <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                        <SelectContent>
                          {AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  /* Social / Other fields */
                  <>
                    <div>
                      <Label>Platform(s)</Label>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {PLATFORM_OPTIONS.map(p => (
                          <label key={p} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={newPost.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />{p}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div><Label>Caption</Label><Textarea value={newPost.caption} onChange={e => setNewPost({ ...newPost, caption: e.target.value })} placeholder="Post caption" /></div>
                    <div><Label>Hashtags</Label><Input value={newPost.hashtags} onChange={e => setNewPost({ ...newPost, hashtags: e.target.value })} placeholder="#hashtags" /></div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assign to</Label>
                    <Select value={newPost.assigned_to_user_id} onValueChange={v => setNewPost({ ...newPost, assigned_to_user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>{ssUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reviewer</Label>
                    <Select value={newPost.reviewer_user_id} onValueChange={v => setNewPost({ ...newPost, reviewer_user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                      <SelectContent>{ssUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Clock className="h-4 w-4 mr-2" />{newPost.due_at ? format(newPost.due_at, "PPP") : "Pick a due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarWidget mode="single" selected={newPost.due_at || undefined} onSelect={d => setNewPost({ ...newPost, due_at: d || null })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div><Label>Creative</Label><Input type="file" accept="image/*,video/*" onChange={e => setCreativeFile(e.target.files?.[0] || null)} /></div>
                <div>
                  <Label>Schedule Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="h-4 w-4 mr-2" />{newPost.scheduled_at ? format(newPost.scheduled_at, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarWidget mode="single" selected={newPost.scheduled_at || undefined} onSelect={d => setNewPost({ ...newPost, scheduled_at: d || null })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div><Label>Internal Notes (team only)</Label><Textarea value={newPost.internal_notes} onChange={e => setNewPost({ ...newPost, internal_notes: e.target.value })} placeholder="Team notes..." /></div>
                <Button className="w-full" onClick={() => createPost.mutate()} disabled={!newPost.client_id || !newPost.title || createPost.isPending}>
                  {createPost.isPending ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Primary Kanban — daily working columns */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex gap-5 pb-4" style={{ minWidth: PRIMARY_COLUMNS.length * 310 }}>
          {PRIMARY_COLUMNS.map(col => {
            const columnPosts = posts.filter((p: any) => {
              if (p.status_column !== col.key) return false;
              if (filterValues.contentType !== "all" && p.content_type !== filterValues.contentType) return false;
              if (filterValues.client !== "all" && p.client_id !== filterValues.client) return false;
              if (globalClientId && p.client_id !== globalClientId) return false;
              if (filterValues.assignee !== "all" && p.assigned_to_user_id !== filterValues.assignee) return false;
              if (filterValues.priority !== "all") {
                const postPriority = (p as any).priority || "normal";
                if (postPriority !== filterValues.priority) return false;
              }
              if (!applyDueDateFilter(p.due_at, filterValues.dueDate || "all")) return false;
              return true;
            });
            return (
              <div key={col.key} className="w-[290px] shrink-0 flex flex-col bg-accent/30 rounded-xl" onDrop={e => handleDrop(e, col.key)} onDragOver={handleDragOver}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <Badge variant="secondary" className="text-[11px]">{columnPosts.length}</Badge>
                </div>
                <div className="px-2 pb-3 space-y-2 flex-1 min-h-[120px]">
                  {columnPosts.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border border-dashed border-muted-foreground/20 rounded-lg">
                      Drop here
                    </div>
                  )}
                  {columnPosts.map(renderCard)}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedPost && (
        <WorkflowCardDialog
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={open => { if (!open) setSelectedPost(null); }}
          ssUsers={ssUsers}
        />
      )}
    </div>
  );
}
