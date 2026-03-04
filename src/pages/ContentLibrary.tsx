import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Film, Video, FolderOpen } from "lucide-react";

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

  const filterPosts = (tab: string) => {
    if (tab === "all") return posts;
    if (tab === "reels") return posts.filter((p) => isReel(p.platform));
    if (tab === "videos") return posts.filter((p) => isVideo(p.creative_url) && !isReel(p.platform));
    // images = has creative_url that's not a video, and not a reel
    return posts.filter((p) => p.creative_url && !isVideo(p.creative_url) && !isReel(p.platform));
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
          <Card
            key={post.id}
            className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
            onClick={() => navigate(`/approvals/${post.id}`)}
          >
            <AspectRatio ratio={1}>
              {post.creative_url ? (
                isVideo(post.creative_url) ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Film className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                ) : (
                  <img
                    src={post.creative_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
            </AspectRatio>
            <CardContent className="p-3">
              <p className="text-sm font-medium truncate">{post.title}</p>
              <div className="flex items-center justify-between mt-1.5">
                {post.platform && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {post.platform}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {format(new Date(post.scheduled_at || post.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Library</h1>
        <p className="text-sm text-muted-foreground">Browse all your published content</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="h-3.5 w-3.5 mr-1" /> Images
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-3.5 w-3.5 mr-1" /> Videos
            </TabsTrigger>
            <TabsTrigger value="reels">
              <Film className="h-3.5 w-3.5 mr-1" /> Reels
            </TabsTrigger>
          </TabsList>
          {["all", "images", "videos", "reels"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <PostGrid items={filterPosts(tab)} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
