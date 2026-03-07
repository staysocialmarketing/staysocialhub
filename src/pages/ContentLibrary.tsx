import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Film, Video, FolderOpen, Upload, Download, Link2, Mic } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

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

export default function ContentLibrary() {
  const navigate = useNavigate();
  const { profile, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["content-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, platform, creative_url, created_at, scheduled_at")
        .eq("status_column", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: voiceNotes = [], isLoading: voiceLoading } = useQuery({
    queryKey: ["client-voice-notes", profile?.client_id],
    enabled: !!profile?.client_id,
    queryFn: async () => {
      const clientId = profile!.client_id!;
      const { data, error } = await supabase.storage
        .from("creative-assets")
        .list(`${clientId}/voice-notes`, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data || [])
        .filter((f) => f.name.endsWith(".webm"))
        .map((f) => ({
          name: f.name,
          created_at: f.created_at || "",
          url: supabase.storage.from("creative-assets").getPublicUrl(`${clientId}/voice-notes/${f.name}`).data.publicUrl,
        })) as VoiceNoteFile[];
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

  const filterPosts = (tab: string) => {
    let filtered;
    if (tab === "all") filtered = posts;
    else if (tab === "reels") filtered = posts.filter((p) => isReel(p.platform));
    else if (tab === "videos") filtered = posts.filter((p) => isVideo(p.creative_url) && !isReel(p.platform));
    else filtered = posts.filter((p) => p.creative_url && !isVideo(p.creative_url) && !isReel(p.platform));
    return filtered.slice(0, visibleCount);
  };

  const totalForTab = (tab: string) => {
    if (tab === "all") return posts.length;
    if (tab === "reels") return posts.filter((p) => isReel(p.platform)).length;
    if (tab === "videos") return posts.filter((p) => isVideo(p.creative_url) && !isReel(p.platform)).length;
    return posts.filter((p) => p.creative_url && !isVideo(p.creative_url) && !isReel(p.platform)).length;
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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No published content yet</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((post) => (
          <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group" onClick={() => navigate(`/approvals/${post.id}`)}>
            <AspectRatio ratio={1}>
              {post.creative_url ? (
                isVideo(post.creative_url) ? (
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
                <div className="flex items-center gap-1">
                  {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.platform}</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(post.scheduled_at || post.created_at), "MMM d, yyyy")}</span>
              </div>
              {post.creative_url && (
                <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={(e) => handleDownload(post.creative_url!, e)}>
                    <Download className="h-3 w-3 mr-0.5" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={(e) => handleCopyLink(post.creative_url!, e)}>
                    <Link2 className="h-3 w-3 mr-0.5" /> Copy Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const VoiceNotesGrid = () => {
    if (voiceLoading) {
      return <p className="text-muted-foreground text-sm py-10 text-center">Loading voice notes…</p>;
    }
    if (voiceNotes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Mic className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No voice notes yet</p>
          <p className="text-xs mt-1">Use the + button to record a voice note</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {voiceNotes.map((vn) => (
          <Card key={vn.name} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium truncate">{vn.name.replace("voice-", "").replace(".webm", "")}</p>
              </div>
              <audio src={vn.url} controls className="w-full" />
              {vn.created_at && (
                <span className="text-[10px] text-muted-foreground">{format(new Date(vn.created_at), "MMM d, yyyy h:mm a")}</span>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleDownload(vn.url)}>
                  <Download className="h-3 w-3 mr-0.5" /> Download
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleCopyLink(vn.url)}>
                  <Link2 className="h-3 w-3 mr-0.5" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Media</h1>
          <p className="text-sm text-muted-foreground">Browse all your published content</p>
        </div>
        {isClientAdmin && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-2" />Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Content</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Title</Label>
                  <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Content title" />
                </div>
                <div>
                  <Label>File</Label>
                  <Input type="file" accept="image/*,video/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                </div>
                <Button className="w-full" onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><p className="text-muted-foreground text-sm">Loading…</p></div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
            <TabsTrigger value="images"><ImageIcon className="h-3.5 w-3.5 mr-1" /> Images</TabsTrigger>
            <TabsTrigger value="videos"><Video className="h-3.5 w-3.5 mr-1" /> Videos</TabsTrigger>
            <TabsTrigger value="reels"><Film className="h-3.5 w-3.5 mr-1" /> Reels</TabsTrigger>
            <TabsTrigger value="voice-notes"><Mic className="h-3.5 w-3.5 mr-1" /> Voice Notes</TabsTrigger>
          </TabsList>
          {["all", "images", "videos", "reels"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <PostGrid items={filterPosts(tab)} />
              {totalForTab(tab) > visibleCount && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setVisibleCount((c) => c + 50)}>
                    Load More ({totalForTab(tab) - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
          <TabsContent value="voice-notes">
            <VoiceNotesGrid />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
