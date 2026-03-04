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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare, Calendar, Image as ImageIcon, Plus, Hash, Clock, FileText, Film, LayoutGrid, Play,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import WorkflowCardDialog from "@/components/WorkflowCardDialog";

type PostStatus = Database["public"]["Enums"]["post_status"];

const WORKFLOW_COLUMNS: { key: PostStatus; label: string }[] = [
  { key: "idea", label: "Idea" },
  { key: "writing", label: "Writing" },
  { key: "design", label: "Design" },
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
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [newPost, setNewPost] = useState({
    client_id: "",
    title: "",
    platforms: [] as string[],
    caption: "",
    hashtags: "",
    internal_notes: "",
    scheduled_at: null as Date | null,
    assigned_to_user_id: "",
    reviewer_user_id: "",
    due_at: null as Date | null,
  });
  const [creativeFile, setCreativeFile] = useState<File | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["workflow-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), assigned_user:assigned_to_user_id(name), reviewer:reviewer_user_id(name), clients(name)")
        .in("status_column", ["idea", "writing", "design", "internal_review"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, users:user_id(id, name, email)")
        .in("role", ["ss_admin", "ss_producer", "ss_ops"]);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter((r: any) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      }).map((r: any) => r.users);
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      let creative_url: string | null = null;
      if (creativeFile) {
        const ext = creativeFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("creative-assets").upload(path, creativeFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
        creative_url = urlData.publicUrl;
      }
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          client_id: newPost.client_id,
          title: newPost.title,
          platform: newPost.platforms.join(", "),
          caption: newPost.caption || null,
          hashtags: newPost.hashtags || null,
          creative_url,
          scheduled_at: newPost.scheduled_at?.toISOString() || null,
          status_column: "idea" as PostStatus,
          created_by_user_id: profile.id,
          internal_notes: newPost.internal_notes || null,
          assigned_to_user_id: newPost.assigned_to_user_id || null,
          reviewer_user_id: newPost.reviewer_user_id || null,
          due_at: newPost.due_at?.toISOString() || null,
        } as any)
        .select()
        .single();
      if (postError) throw postError;
      await supabase.from("post_versions").insert({
        post_id: postData.id,
        version_number: 1,
        creative_url,
        caption: newPost.caption || null,
        hashtags: newPost.hashtags || null,
        created_by_user_id: profile.id,
      });
      return postData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post created!");
      setCreateOpen(false);
      setNewPost({ client_id: "", title: "", platforms: [], caption: "", hashtags: "", internal_notes: "", scheduled_at: null, assigned_to_user_id: "", reviewer_user_id: "", due_at: null });
      setCreativeFile(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });

  const movePost = useMutation({
    mutationFn: async ({ postId, newStatus }: { postId: string; newStatus: PostStatus }) => {
      // The DB trigger handles auto-reassignment for 'design', but we also set it client-side
      const updatePayload: any = { status_column: newStatus };
      if (newStatus === "design") {
        const opsUser = ssUsers.find((u: any) => u.id); // fallback; trigger does the real work
        // Trigger will handle reassignment via auto_reassign_on_design
      }
      const { error } = await supabase.from("posts").update(updatePayload).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post moved");
    },
    onError: () => toast.error("Failed to move post"),
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
    setNewPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading workflow board...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workflow</h2>
          <p className="text-muted-foreground">Team production pipeline — drag cards between stages</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="reel">Reel</SelectItem>
              <SelectItem value="carousel">Carousel</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Client</Label>
                <Select value={newPost.client_id} onValueChange={(v) => setNewPost({ ...newPost, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Post Title</Label>
                <Input value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} placeholder="Post title" />
              </div>
              <div>
                <Label>Platform(s)</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {PLATFORM_OPTIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={newPost.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assign to</Label>
                  <Select value={newPost.assigned_to_user_id} onValueChange={(v) => setNewPost({ ...newPost, assigned_to_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {ssUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reviewer</Label>
                  <Select value={newPost.reviewer_user_id} onValueChange={(v) => setNewPost({ ...newPost, reviewer_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                    <SelectContent>
                      {ssUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Clock className="h-4 w-4 mr-2" />
                      {newPost.due_at ? format(newPost.due_at, "PPP") : "Pick a due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarWidget mode="single" selected={newPost.due_at || undefined} onSelect={(d) => setNewPost({ ...newPost, due_at: d || null })} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div><Label>Caption</Label><Textarea value={newPost.caption} onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })} placeholder="Post caption" /></div>
              <div><Label>Hashtags</Label><Input value={newPost.hashtags} onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })} placeholder="#hashtags" /></div>
              <div><Label>Creative</Label><Input type="file" accept="image/*,video/*" onChange={(e) => setCreativeFile(e.target.files?.[0] || null)} /></div>
              <div>
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="h-4 w-4 mr-2" />
                      {newPost.scheduled_at ? format(newPost.scheduled_at, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarWidget mode="single" selected={newPost.scheduled_at || undefined} onSelect={(d) => setNewPost({ ...newPost, scheduled_at: d || null })} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div><Label>Internal Notes (team only)</Label><Textarea value={newPost.internal_notes} onChange={(e) => setNewPost({ ...newPost, internal_notes: e.target.value })} placeholder="Team notes..." /></div>
              <Button className="w-full" onClick={() => createPost.mutate()} disabled={!newPost.client_id || !newPost.title || createPost.isPending}>
                {createPost.isPending ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex gap-4 pb-4" style={{ minWidth: WORKFLOW_COLUMNS.length * 280 }}>
          {WORKFLOW_COLUMNS.map((col) => {
            const columnPosts = posts.filter((p: any) => p.status_column === col.key && (contentTypeFilter === "all" || p.content_type === contentTypeFilter));
            return (
              <div
                key={col.key}
                className="w-[260px] shrink-0 flex flex-col bg-muted/50 rounded-lg"
                onDrop={(e) => handleDrop(e, col.key)}
                onDragOver={handleDragOver}
              >
                <div className="px-3 py-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{columnPosts.length}</Badge>
                </div>
                <div className="px-2 pb-2 space-y-2 flex-1 min-h-[100px]">
                  {columnPosts.map((post: any) => {
                    const dueDateColor = getDueDateColor(post.due_at);
                    const ct = post.content_type ? contentTypeConfig[post.content_type] : null;
                    return (
                      <Card
                        key={post.id}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id, post.status_column)}
                        onClick={() => setSelectedPost(post)}
                      >
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
                          <div className="flex flex-wrap gap-1">
                            {/* Client badge */}
                            {post.clients?.name && (
                              <Badge variant="outline" className="text-[10px]">{post.clients.name}</Badge>
                            )}
                            {/* Content type badge */}
                            {ct && (
                              <Badge variant="secondary" className={cn("text-[10px] gap-1", ct.className)}>
                                {ct.icon}{ct.label}
                              </Badge>
                            )}
                            {/* From Request badge */}
                            {post.request_id && (
                              <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground gap-1">
                                <FileText className="h-2.5 w-2.5" />Request
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {post.platform?.split(",").map((p: string) => (
                              <Badge key={p} variant="secondary" className={`text-[10px] ${platformColors[p.trim().toLowerCase()] || ""}`}>
                                {p.trim()}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {post.due_at && (
                                <span className={cn("flex items-center gap-1", dueDateColor)}>
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(post.due_at), "MMM d")}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : "TBD"}
                              </span>
                            </div>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments?.length || 0}
                            </span>
                          </div>
                          {post.assigned_user?.name && (
                            <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                              <UserInitials name={post.assigned_user.name} />
                              <span className="text-[10px] text-muted-foreground truncate">{post.assigned_user.name}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Inline edit dialog */}
      {selectedPost && (
        <WorkflowCardDialog
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(open) => { if (!open) setSelectedPost(null); }}
          ssUsers={ssUsers}
        />
      )}
    </div>
  );
}
