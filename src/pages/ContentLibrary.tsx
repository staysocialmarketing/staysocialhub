import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Film, Video, FolderOpen, Upload, Download, Link2, Mic, Search, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

interface PostTag {
  category: string;
  value: string;
}

function parseTags(tags: unknown): PostTag[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t: any) => t && typeof t.category === "string" && typeof t.value === "string");
}

function isVideo(url: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi)$/i.test(url);
}

function isReel(platform: string | null) {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return p.includes("reel") || p.includes("tiktok") || p.includes("short");
}

interface VoiceNoteFile {
  name: string;
  created_at: string;
  url: string;
}

const tabOptions = [
  { value: "all", label: "All", icon: null },
  { value: "images", label: "Images", icon: ImageIcon },
  { value: "videos", label: "Videos", icon: Video },
  { value: "reels", label: "Reels", icon: Film },
  { value: "voice-notes", label: "Voice Notes", icon: Mic },
];

export default function ContentLibrary() {
  const navigate = useNavigate();
  const { profile, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["content-library", profile?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, platform, creative_url, created_at, scheduled_at, tags")
        .eq("status_column", "published")
        .eq("client_id", profile?.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const { data: voiceNotes = [], isLoading: voiceLoading } = useQuery({
    queryKey: ["client-voice-notes", profile?.client_id],
    enabled: !!profile?.client_id,
    queryFn: async () => {
      const clientId = profile!.client_id!;
      const { data, error } = await supabase.storage
        .from("voice-notes")
        .list(`${clientId}/voice-notes`, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const files = (data || []).filter((f) => f.name.endsWith(".webm"));
      const results: VoiceNoteFile[] = [];
      for (const f of files) {
        const { data: signedData } = await supabase.storage
          .from("voice-notes")
          .createSignedUrl(`${clientId}/voice-notes/${f.name}`, 3600);
        results.push({
          name: f.name,
          created_at: f.created_at || "",
          url: signedData?.signedUrl || "",
        });
      }
      return results;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !profile?.client_id) throw new Error("Missing file or client");
      const compressed = await compressImage(uploadFile);
      const ext = compressed.name.split(".").pop();
      const path = `${profile.client_id}/${crypto.randomUUID()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from("creative-assets").upload(path, compressed);
      if (storageErr) throw storageErr;
      const { data: { publicUrl } } = supabase.storage.from("creative-assets").getPublicUrl(path);

      const { error } = await supabase.from("posts").insert({
        client_id: profile.client_id,
        title: uploadTitle || uploadFile.name,
        creative_url: publicUrl,
        status_column: "published",
        created_by_user_id: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-library"] });
      toast.success("Content uploaded!");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
    },
    onError: () => toast.error("Upload failed"),
  });

  const searchedPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const platform = (p.platform || "").toLowerCase();
      const tagValues = parseTags(p.tags).map((t) => t.value.toLowerCase());
      return title.includes(q) || platform.includes(q) || tagValues.some((v) => v.includes(q));
    });
  }, [posts, searchQuery]);

  const filterPosts = (tab: string) => {
    let filtered;
    if (tab === "all") filtered = searchedPosts;
    else if (tab === "reels") filtered = searchedPosts.filter((p) => isReel(p.platform));
    else if (tab === "videos") filtered = searchedPosts.filter((p) => isVideo(p.creative_url) && !isReel(p.platform));
    else filtered = searchedPosts.filter((p) => p.creative_url && !isVideo(p.creative_url) && !isReel(p.platform));
    return filtered.slice(0, visibleCount);
  };

  const totalForTab = (tab: string) => {
    if (tab === "all") return searchedPosts.length;
    if (tab === "reels") return searchedPosts.filter((p) => isReel(p.platform)).length;
    if (tab === "videos") return searchedPosts.filter((p) => isVideo(p.creative_url) && !isReel(p.platform)).length;
    return searchedPosts.filter((p) => p.creative_url && !isVideo(p.creative_url) && !isReel(p.platform)).length;
  };

  const handleDownload = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const PostGrid = ({ items }: { items: typeof posts }) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No published content yet</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((post) => {
          const tags = parseTags(post.tags);
          return (
            <div key={post.id} className="card-elevated overflow-hidden cursor-pointer hover:shadow-lifted transition-all group" onClick={() => navigate(`/approvals/${post.id}`)}>
              <AspectRatio ratio={1}>
                {post.creative_url ? (
                  isVideo(post.creative_url) ? (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center"><Film className="h-10 w-10 text-muted-foreground/30" /></div>
                  ) : (
                    <img src={post.creative_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )
                ) : (
                  <div className="w-full h-full bg-muted/30 flex items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground/30" /></div>
                )}
              </AspectRatio>
              <div className="p-3">
                <p className="text-sm font-semibold truncate">{post.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                    {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0">{post.platform}</Badge>}
                  </div>
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
                {post.creative_url && (
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={(e) => handleDownload(post.creative_url!, e)}>
                      <Download className="h-3 w-3 mr-0.5" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={(e) => handleCopyLink(post.creative_url!, e)}>
                      <Link2 className="h-3 w-3 mr-0.5" /> Copy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const VoiceNotesGrid = () => {
    if (voiceLoading) {
      return <p className="text-muted-foreground/50 text-sm py-10 text-center">Loading voice notes…</p>;
    }
    if (voiceNotes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
          <Mic className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No voice notes yet</p>
          <p className="text-xs mt-1">Use the + button to record a voice note</p>
        </div>
      );
    }
    return (
      <div className="card-elevated divide-y divide-border/20">
        {voiceNotes.map((vn) => (
          <div key={vn.name} className="p-4 flex items-center gap-4">
            <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <Mic className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-medium truncate">{vn.name.replace("voice-", "").replace(".webm", "")}</p>
              <audio src={vn.url} controls className="w-full h-8" />
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {vn.created_at && (
                <span className="text-[10px] text-muted-foreground/50">{format(new Date(vn.created_at), "MMM d, yyyy")}</span>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleDownload(vn.url)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleCopyLink(vn.url)}>
                  <Link2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Media</h1>
          <p className="text-sm text-muted-foreground/70">Browse all your published content</p>
        </div>
        {isClientAdmin && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-2" />Upload</Button>
            </DialogTrigger>
            <DialogContent className="shadow-float border-0">
              <DialogHeader><DialogTitle>Upload Content</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Content title" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">File</Label>
                  <div className="border-2 border-dashed border-border/40 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
                    <Input type="file" accept="image/*,video/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="border-0 p-0" />
                    {!uploadFile && <p className="text-xs text-muted-foreground/50 mt-2">Drag & drop or click to browse</p>}
                  </div>
                </div>
                <Button className="w-full" onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search by title, platform, tag…"
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><p className="text-muted-foreground/50 text-sm">Loading…</p></div>
      ) : (
        <>
          {/* Pill tab toggles */}
          <div className="flex gap-1.5 flex-wrap">
            {tabOptions.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  activeTab === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {t.icon && <t.icon className="h-3.5 w-3.5" />}
                {t.label}
                {t.value !== "voice-notes" && <span className="text-[10px] opacity-70">({totalForTab(t.value)})</span>}
              </button>
            ))}
          </div>

          {activeTab === "voice-notes" ? (
            <VoiceNotesGrid />
          ) : (
            <>
              <PostGrid items={filterPosts(activeTab)} />
              {totalForTab(activeTab) > visibleCount && (
                <div className="flex justify-center pt-4">
                  <Button variant="ghost" className="bg-muted/50" onClick={() => setVisibleCount((c) => c + 50)}>
                    Load More ({totalForTab(activeTab) - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
