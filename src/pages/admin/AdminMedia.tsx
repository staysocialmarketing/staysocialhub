import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import { format } from "date-fns";
import { ImageIcon, Film, FolderOpen, Archive, Trash2, Download, Link2, Mic } from "lucide-react";
import { toast } from "sonner";
import { extractStoragePath } from "@/lib/imageUtils";

function isVideo(url: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi)$/i.test(url) && !isVoiceNote(url);
}

function isVoiceNote(url: string | null) {
  if (!url) return false;
  return /voice-notes\/.*\.webm$/i.test(url) || /voice-\d+\.webm$/i.test(url);
}

function isDocument(url: string | null) {
  if (!url) return false;
  return /\.(pdf|doc|docx|txt|csv|xlsx|pptx)$/i.test(url);
}

function getMediaType(url: string | null): string {
  if (!url) return "other";
  if (isVoiceNote(url)) return "voice";
  if (isVideo(url)) return "video";
  if (isDocument(url)) return "document";
  return "image";
}

export default function AdminMedia() {
  const { isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const queryClient = useQueryClient();
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [editPost, setEditPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [pageSize] = useState(50);
  const [visibleCount, setVisibleCount] = useState(50);

  const { data: clients = [] } = useQuery({
    queryKey: ["media-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-media-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, platform, creative_url, created_at, scheduled_at, client_id, status_column, clients(name)")
        .in("status_column", ["published", "approved", "scheduled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const effectiveClientFilter = globalClientId || (clientFilter !== "all" ? clientFilter : null);
  let filteredPosts = effectiveClientFilter ? posts.filter((p: any) => p.client_id === effectiveClientFilter) : posts;
  if (mediaTypeFilter !== "all") {
    filteredPosts = filteredPosts.filter((p: any) => getMediaType(p.creative_url) === mediaTypeFilter);
  }
  const paginatedPosts = filteredPosts.slice(0, visibleCount);
  const hasMore = filteredPosts.length > visibleCount;

  const grouped = paginatedPosts.reduce((acc: Record<string, any[]>, post: any) => {
    const name = post.clients?.name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(post);
    return acc;
  }, {});

  const openEdit = (post: any) => {
    setEditPost(post);
    setEditTitle(post.title);
    setEditClientId(post.client_id || "");
  };

  const handleSave = async () => {
    if (!editPost || !editTitle.trim()) return;
    const { error } = await supabase.from("posts").update({
      title: editTitle.trim(),
      client_id: editClientId || editPost.client_id,
    }).eq("id", editPost.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Media updated!");
    setEditPost(null);
    queryClient.invalidateQueries({ queryKey: ["admin-media-posts"] });
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from("posts").update({ status_column: "idea" as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Media archived");
    setEditPost(null);
    queryClient.invalidateQueries({ queryKey: ["admin-media-posts"] });
  };

  const handleDelete = async () => {
    if (!deletePostId) return;
    const postToDelete = posts.find((p: any) => p.id === deletePostId);
    const { error } = await supabase.from("posts").delete().eq("id", deletePostId);
    if (error) { toast.error(error.message); return; }
    if (postToDelete?.creative_url) {
      const storagePath = extractStoragePath(postToDelete.creative_url, "creative-assets");
      if (storagePath) {
        await supabase.storage.from("creative-assets").remove([storagePath]);
      }
    }
    toast.success("Media deleted");
    setDeletePostId(null);
    setEditPost(null);
    queryClient.invalidateQueries({ queryKey: ["admin-media-posts"] });
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">All published client media, organized by client</p>
        </div>
        <div className="flex gap-2">
          <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="voice">Voice Notes</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No published media yet</p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([clientName, clientPosts]) => (
          <div key={clientName}>
            <h3 className="text-lg font-semibold text-foreground mb-3">{clientName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {(clientPosts as any[]).map((post) => (
                <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group" onClick={() => openEdit(post)}>
                  <AspectRatio ratio={1}>
                    {post.creative_url ? (
                      isVoiceNote(post.creative_url) ? (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2 p-4">
                          <Mic className="h-10 w-10 text-primary/50" />
                          <audio src={post.creative_url} controls className="w-full max-w-[90%]" onClick={(e) => e.stopPropagation()} />
                        </div>
                      ) : isVideo(post.creative_url) ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><Film className="h-10 w-10 text-muted-foreground/50" /></div>
                      ) : (
                        <img src={post.creative_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground/50" /></div>
                    )}
                  </AspectRatio>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.platform}</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(post.scheduled_at || post.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setVisibleCount((c) => c + pageSize)}>
            Load More ({filteredPosts.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* Edit Media Dialog */}
      <Dialog open={!!editPost} onOpenChange={(o) => !o && setEditPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Media</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={editClientId} onValueChange={setEditClientId} allowNone={false} />
            </div>
            {editPost?.creative_url && (
              <>
                <div className="rounded-md overflow-hidden border">
                  {isVideo(editPost.creative_url) ? (
                    <video src={editPost.creative_url} controls className="w-full max-h-48 object-contain" />
                  ) : (
                    <img src={editPost.creative_url} alt={editTitle} className="w-full max-h-48 object-contain" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(editPost.creative_url)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopyLink(editPost.creative_url)}>
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Copy Link
                  </Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <div className="flex gap-2">
              {isSSAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => editPost && handleArchive(editPost.id)}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => editPost && setDeletePostId(editPost.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditPost(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!editTitle.trim()}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePostId} onOpenChange={(o) => !o && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this media item. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
