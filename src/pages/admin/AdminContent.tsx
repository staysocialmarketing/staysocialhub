import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Image as ImageIcon, Plus, Calendar, Upload, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

const statusLabels: Record<string, string> = {
  new_requests: "New",
  content_process: "Content",
  design_process: "Design",
  request_changes: "Changes",
  content_for_approval: "For Approval",
  approved: "Approved",
  in_the_queue: "Queued",
  published: "Published",
};

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "TikTok"];

export default function AdminContent() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [newPost, setNewPost] = useState({
    client_id: "",
    title: "",
    platforms: [] as string[],
    caption: "",
    hashtags: "",
    internal_notes: "",
    scheduled_at: null as Date | null,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name), post_versions(id), approvals(id, type, created_at, users:user_id(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
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
          status_column: "content_process" as PostStatus,
          created_by_user_id: profile.id,
          internal_notes: newPost.internal_notes || null,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post created!");
      setCreateOpen(false);
      setNewPost({ client_id: "", title: "", platforms: [], caption: "", hashtags: "", internal_notes: "", scheduled_at: null });
      setCreativeFile(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });

  const updatePost = useMutation({
    mutationFn: async () => {
      if (!editPost) return;
      const { error } = await supabase.from("posts").update({
        title: editPost.title,
        caption: editPost.caption,
        hashtags: editPost.hashtags,
        status_column: editPost.status_column,
        internal_notes: editPost.internal_notes,
      } as any).eq("id", editPost.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post updated!");
      setEditPost(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const togglePlatform = (p: string) => {
    setNewPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Content Management</h2>
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
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Post Title</Label><Input value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} /></div>
              <div>
                <Label>Platform(s)</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {PLATFORM_OPTIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={newPost.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />{p}
                    </label>
                  ))}
                </div>
              </div>
              <div><Label>Caption</Label><Textarea value={newPost.caption} onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })} /></div>
              <div><Label>Hashtags</Label><Input value={newPost.hashtags} onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })} /></div>
              <div><Label>Creative</Label><Input type="file" accept="image/*,video/*" onChange={(e) => setCreativeFile(e.target.files?.[0] || null)} /></div>
              <div>
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="h-4 w-4 mr-2" />{newPost.scheduled_at ? format(newPost.scheduled_at, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><CalendarWidget mode="single" selected={newPost.scheduled_at || undefined} onSelect={(d) => setNewPost({ ...newPost, scheduled_at: d || null })} /></PopoverContent>
                </Popover>
              </div>
              <div><Label>Internal Notes</Label><Textarea value={newPost.internal_notes} onChange={(e) => setNewPost({ ...newPost, internal_notes: e.target.value })} /></div>
              <Button className="w-full" onClick={() => createPost.mutate()} disabled={!newPost.client_id || !newPost.title || createPost.isPending}>
                {createPost.isPending ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {p.creative_url ? (
                    <img src={p.creative_url} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{p.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {p.clients?.name} · {p.platform || "No platform"}
                    {p.post_versions?.length > 0 && ` · ${p.post_versions.length} version(s)`}
                    {p.approvals?.length > 0 && ` · ${p.approvals.length} approval(s)`}
                  </p>
                </div>
                <Badge variant="secondary">{statusLabels[p.status_column] || p.status_column}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditPost({ ...p })}>
                  <Eye className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-muted-foreground text-center py-8">No content yet</p>}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editPost} onOpenChange={() => setEditPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          {editPost && (
            <div className="space-y-4 mt-2">
              <div><Label>Title</Label><Input value={editPost.title} onChange={(e) => setEditPost({ ...editPost, title: e.target.value })} /></div>
              <div><Label>Caption</Label><Textarea value={editPost.caption || ""} onChange={(e) => setEditPost({ ...editPost, caption: e.target.value })} /></div>
              <div><Label>Hashtags</Label><Input value={editPost.hashtags || ""} onChange={(e) => setEditPost({ ...editPost, hashtags: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editPost.status_column} onValueChange={(v) => setEditPost({ ...editPost, status_column: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Internal Notes</Label><Textarea value={(editPost as any).internal_notes || ""} onChange={(e) => setEditPost({ ...editPost, internal_notes: e.target.value })} /></div>
              {editPost.approvals?.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Approval Log</Label>
                  <div className="space-y-1 mt-1">
                    {editPost.approvals.map((a: any) => (
                      <p key={a.id} className="text-xs text-muted-foreground">
                        {a.type} by {a.users?.name || "Unknown"} · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <Button className="w-full" onClick={() => updatePost.mutate()} disabled={updatePost.isPending}>
                {updatePost.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
