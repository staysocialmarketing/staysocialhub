import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
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
import { ImageIcon, Film, FolderOpen, Archive, Trash2, Download, Link2, Mic, Search, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { extractStoragePath } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

interface PostTag {
  category: string;
  value: string;
}

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

function parseTags(tags: unknown): PostTag[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t: any) => t && typeof t.category === "string" && typeof t.value === "string");
}

const TAG_CATEGORIES = ["campaign", "content_type", "custom"];

const mediaTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "voice", label: "Voice Notes" },
  { value: "document", label: "Documents" },
];

export default function AdminMedia() {
  const { isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const queryClient = useQueryClient();
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editPost, setEditPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editTags, setEditTags] = useState<PostTag[]>([]);
  const [newTagCategory, setNewTagCategory] = useState("campaign");
  const [newTagValue, setNewTagValue] = useState("");
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
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
        .select("id, title, platform, creative_url, created_at, scheduled_at, client_id, status_column, tags, clients(name)")
        .in("status_column", ["published", "approved", "scheduled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const campaignOptions = useMemo(() => {
    const campaigns = new Set<string>();
    posts.forEach((p: any) => {
      parseTags(p.tags).forEach((t) => {
        if (t.category === "campaign") campaigns.add(t.value);
      });
    });
    return Array.from(campaigns).sort();
  }, [posts]);

  const existingTagValues = useMemo(() => {
    const byCategory: Record<string, Set<string>> = {};
    posts.forEach((p: any) => {
      parseTags(p.tags).forEach((t) => {
        if (!byCategory[t.category]) byCategory[t.category] = new Set();
        byCategory[t.category].add(t.value);
      });
    });
    return byCategory;
  }, [posts]);

  const effectiveClientFilter = globalClientId || (clientFilter !== "all" ? clientFilter : null);
  
  const filteredPosts = useMemo(() => {
    let result = posts as any[];
    if (effectiveClientFilter) result = result.filter((p) => p.client_id === effectiveClientFilter);
    if (mediaTypeFilter !== "all") result = result.filter((p) => getMediaType(p.creative_url) === mediaTypeFilter);
    if (campaignFilter !== "all") {
      result = result.filter((p) => parseTags(p.tags).some((t) => t.category === "campaign" && t.value === campaignFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const clientName = (p.clients?.name || "").toLowerCase();
        const title = (p.title || "").toLowerCase();
        const platform = (p.platform || "").toLowerCase();
        const tagValues = parseTags(p.tags).map((t) => t.value.toLowerCase());
        return title.includes(q) || clientName.includes(q) || platform.includes(q) || tagValues.some((v) => v.includes(q));
      });
    }
    return result;
  }, [posts, effectiveClientFilter, mediaTypeFilter, campaignFilter, searchQuery]);

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
    setEditTags(parseTags(post.tags));
  };

  const handleSave = async () => {
    if (!editPost || !editTitle.trim()) return;
    const { error } = await supabase.from("posts").update({
      title: editTitle.trim(),
      client_id: editClientId || editPost.client_id,
      tags: editTags as any,
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

  const addTag = () => {
    const val = newTagValue.trim();
    if (!val) return;
    if (editTags.some((t) => t.category === newTagCategory && t.value === val)) {
      toast.error("Tag already exists");
      return;
    }
    setEditTags([...editTags, { category: newTagCategory, value: val }]);
    setNewTagValue("");
  };

  const removeTag = (idx: number) => {
    setEditTags(editTags.filter((_, i) => i !== idx));
  };

  const suggestions = existingTagValues[newTagCategory] ? Array.from(existingTagValues[newTagCategory]).filter(
    (v) => v.toLowerCase().includes(newTagValue.toLowerCase()) && !editTags.some((t) => t.category === newTagCategory && t.value === v)
  ).slice(0, 5) : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Media Library</h1>
          <p className="text-sm text-muted-foreground/70">All published client media, organized by client</p>
        </div>
      </div>

      {/* Integrated search + filter row */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/40" />
          <Input
            placeholder="Search by title, client, platform, tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/30 border-0 focus-visible:ring-1"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5">
              <X className="h-4 w-4 text-muted-foreground/40 hover:text-foreground" />
            </button>
          )}
        </div>
        {/* Pill type filters */}
        <div className="flex gap-1">
          {mediaTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMediaTypeFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                mediaTypeFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-44 h-9 bg-muted/30 border-0">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {campaignOptions.length > 0 && (
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-40 h-9 bg-muted/30 border-0">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground/50 text-sm">Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No published media yet</p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([clientName, clientPosts]) => (
          <div key={clientName}>
            <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">{clientName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {(clientPosts as any[]).map((post) => {
                const tags = parseTags(post.tags);
                return (
                  <div key={post.id} className="card-elevated overflow-hidden cursor-pointer hover:shadow-lifted transition-all group" onClick={() => openEdit(post)}>
                    <AspectRatio ratio={1}>
                      {post.creative_url ? (
                        isVoiceNote(post.creative_url) ? (
                          <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-2 p-4">
                            <Mic className="h-10 w-10 text-primary/40" />
                            <audio src={post.creative_url} controls className="w-full max-w-[90%]" onClick={(e) => e.stopPropagation()} />
                          </div>
                        ) : isVideo(post.creative_url) ? (
                          <div className="w-full h-full bg-muted/20 flex items-center justify-center"><Film className="h-10 w-10 text-muted-foreground/30" /></div>
                        ) : (
                          <img src={post.creative_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        )
                      ) : (
                        <div className="w-full h-full bg-muted/20 flex items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground/30" /></div>
                      )}
                    </AspectRatio>
                    <div className="p-3">
                      <p className="text-sm font-semibold truncate">{post.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0">{post.platform}</Badge>}
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">{format(new Date(post.scheduled_at || post.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {tags.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-muted/50">{t.value}</Badge>
                          ))}
                          {tags.length > 3 && <span className="text-[10px] text-muted-foreground/40">+{tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" className="bg-muted/50" onClick={() => setVisibleCount((c) => c + 50)}>
            Load More ({filteredPosts.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* Edit Media Dialog */}
      <Dialog open={!!editPost} onOpenChange={(o) => !o && setEditPost(null)}>
        <DialogContent className="max-w-md shadow-float border-0">
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

            {/* Tags Section */}
            <div>
              <Label className="text-xs text-muted-foreground">Tags</Label>
              {editTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1.5 mb-2">
                  {editTags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 border-0" onClick={() => removeTag(i)}>
                      <span className="text-muted-foreground">{t.category}:</span> {t.value}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 items-end">
                <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-muted/30 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Tag value"
                    className="h-8 text-xs"
                  />
                  {newTagValue && suggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-popover border border-border/20 rounded-xl shadow-float mt-1 max-h-32 overflow-auto">
                      {suggestions.map((s) => (
                        <button key={s} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors" onClick={() => { setNewTagValue(s); }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2 bg-muted/50" onClick={addTag}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {editPost?.creative_url && (
              <>
                <div className="rounded-2xl overflow-hidden">
                  {isVideo(editPost.creative_url) ? (
                    <video src={editPost.creative_url} controls className="w-full max-h-48 object-contain" />
                  ) : (
                    <img src={editPost.creative_url} alt={editTitle} className="w-full max-h-48 object-contain" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="bg-muted/50" onClick={() => handleDownload(editPost.creative_url)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" className="bg-muted/50" onClick={() => handleCopyLink(editPost.creative_url)}>
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
                  <Button variant="outline" size="sm" className="border-0 bg-muted/50" onClick={() => editPost && handleArchive(editPost.id)}>
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
