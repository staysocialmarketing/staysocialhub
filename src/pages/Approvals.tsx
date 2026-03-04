import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CalendarView from "@/components/approvals/CalendarView";
import {
  MessageSquare, Calendar, Image as ImageIcon, Plus, Upload, Hash, LayoutGrid, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

const COLUMNS: { key: PostStatus; label: string }[] = [
  { key: "new_requests", label: "NEW Requests HERE" },
  { key: "content_process", label: "Content Process" },
  { key: "design_process", label: "Design Process" },
  { key: "request_changes", label: "Request Changes HERE" },
  { key: "content_for_approval", label: "Content for Approval" },
  { key: "approved", label: "Approved (by Client)" },
  { key: "in_the_queue", label: "In The Queue" },
  { key: "published", label: "Published" },
];

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  facebook: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  tiktok: "bg-purple-100 text-purple-800",
};

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "TikTok"];

export default function Approvals() {
  const { profile, isSSRole, isClientAdmin, isClientAssistant } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    client_id: "",
    title: "",
    platforms: [] as string[],
    caption: "",
    hashtags: "",
    internal_notes: "",
    scheduled_at: null as Date | null,
  });
  const [creativeFile, setCreativeFile] = useState<File | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", profile?.client_id],
    queryFn: async () => {
      let query = supabase.from("posts").select("*, comments(id)").order("created_at", { ascending: false });
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      const { data, error } = await query;
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
    enabled: isSSRole,
  });

  const { data: clientSettings } = useQuery({
    queryKey: ["client-settings", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase.from("clients").select("assistants_can_approve").eq("id", profile.client_id).single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      let creative_url: string | null = null;

      if (creativeFile) {
        const ext = creativeFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("creative-assets")
          .upload(path, creativeFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("creative-assets")
          .getPublicUrl(path);
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
          status_column: "content_process" as PostStatus,
          created_by_user_id: profile.id,
          internal_notes: newPost.internal_notes || null,
        } as any)
        .select()
        .single();
      if (postError) throw postError;

      // Create v1 in post_versions
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
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created!");
      setCreateOpen(false);
      setNewPost({ client_id: "", title: "", platforms: [], caption: "", hashtags: "", internal_notes: "", scheduled_at: null });
      setCreativeFile(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });

  const movePost = useMutation({
    mutationFn: async ({ postId, newStatus }: { postId: string; newStatus: PostStatus }) => {
      const { error } = await supabase.from("posts").update({ status_column: newStatus }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post moved");
    },
    onError: () => toast.error("Failed to move post"),
  });

  const canClientMoveCard = (from: PostStatus, to: PostStatus) => {
    if (isSSRole) return true;
    const isAdmin = isClientAdmin;
    const isAssistantAllowed = isClientAssistant && clientSettings?.assistants_can_approve;
    if (!isAdmin && !isAssistantAllowed) return false;
    return (
      (from === "content_for_approval" && to === "approved") ||
      (from === "content_for_approval" && to === "request_changes")
    );
  };

  const handleDragStart = (e: React.DragEvent, postId: string, currentStatus: PostStatus) => {
    e.dataTransfer.setData("postId", postId);
    e.dataTransfer.setData("fromStatus", currentStatus);
  };

  const handleDrop = (e: React.DragEvent, toStatus: PostStatus) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    const fromStatus = e.dataTransfer.getData("fromStatus") as PostStatus;
    if (fromStatus === toStatus) return;
    if (!canClientMoveCard(fromStatus, toStatus)) {
      toast.error("You don't have permission to move cards here");
      return;
    }
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
        <p className="text-muted-foreground">Loading approvals board...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Social Approvals</h2>
          <p className="text-muted-foreground">Drag and drop cards to update status</p>
        </div>
        {isSSRole && (
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
                        <Checkbox
                          checked={newPost.platforms.includes(p)}
                          onCheckedChange={() => togglePlatform(p)}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Caption</Label>
                  <Textarea value={newPost.caption} onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })} placeholder="Post caption" />
                </div>
                <div>
                  <Label>Hashtags</Label>
                  <Input value={newPost.hashtags} onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })} placeholder="#hashtags" />
                </div>
                <div>
                  <Label>Creative</Label>
                  <Input type="file" accept="image/*,video/*" onChange={(e) => setCreativeFile(e.target.files?.[0] || null)} />
                </div>
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
                      <CalendarWidget
                        mode="single"
                        selected={newPost.scheduled_at || undefined}
                        onSelect={(d) => setNewPost({ ...newPost, scheduled_at: d || null })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Internal Notes (team only)</Label>
                  <Textarea value={newPost.internal_notes} onChange={(e) => setNewPost({ ...newPost, internal_notes: e.target.value })} placeholder="Team notes..." />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createPost.mutate()}
                  disabled={!newPost.client_id || !newPost.title || createPost.isPending}
                >
                  {createPost.isPending ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="h-4 w-4" /> Board
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="flex-1 mt-0">
          <ScrollArea className="flex-1">
            <div className="flex gap-4 pb-4" style={{ minWidth: COLUMNS.length * 280 }}>
              {COLUMNS.map((col) => {
                const columnPosts = posts.filter((p: any) => p.status_column === col.key);
                return (
                  <div
                    key={col.key}
                    className="w-[260px] shrink-0 flex flex-col bg-muted/50 rounded-lg"
                    onDrop={(e) => handleDrop(e, col.key)}
                    onDragOver={handleDragOver}
                  >
                    <div className="px-3 py-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {col.label}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnPosts.length}
                      </Badge>
                    </div>
                    <div className="px-2 pb-2 space-y-2 flex-1 min-h-[100px]">
                      {columnPosts.map((post: any) => (
                        <Tooltip key={post.id}>
                          <TooltipTrigger asChild>
                            <Card
                              className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                              draggable
                              onDragStart={(e) => handleDragStart(e, post.id, post.status_column)}
                              onClick={() => navigate(`/approvals/${post.id}`)}
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
                                  {post.platform?.split(",").map((p: string) => (
                                    <Badge
                                      key={p}
                                      variant="secondary"
                                      className={`text-[10px] ${platformColors[p.trim().toLowerCase()] || ""}`}
                                    >
                                      {p.trim()}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {post.scheduled_at
                                      ? new Date(post.scheduled_at).toLocaleDateString()
                                      : "TBD"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {post.comments?.length || 0}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p className="text-xs line-clamp-3">
                              {post.caption ? post.caption.substring(0, 120) + (post.caption.length > 120 ? "…" : "") : "No caption"}
                            </p>
                            {post.hashtags && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {post.hashtags.split(/\s+/).length} tags
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 mt-0">
          <CalendarView posts={posts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
