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
import { ImageIcon, Film, Video, FolderOpen, Upload } from "lucide-react";
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
                {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.platform}</Badge>}
                <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(post.scheduled_at || post.created_at), "MMM d, yyyy")}</span>
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
        </Tabs>
      )}
    </div>
  );
}
