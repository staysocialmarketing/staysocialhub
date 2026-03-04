import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Film, FolderOpen, Image } from "lucide-react";

function isVideo(url: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi)$/i.test(url);
}

export default function AdminMedia() {
  const navigate = useNavigate();
  const { isSSAdmin } = useAuth();
  const [clientFilter, setClientFilter] = useState<string>("all");

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
        .select("id, title, platform, creative_url, created_at, scheduled_at, client_id, clients(name)")
        .eq("status_column", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredPosts = clientFilter === "all" ? posts : posts.filter((p: any) => p.client_id === clientFilter);

  // Group by client
  const grouped = filteredPosts.reduce((acc: Record<string, any[]>, post: any) => {
    const name = post.clients?.name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(post);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">All published client media, organized by client</p>
        </div>
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
          </div>
        ))
      )}
    </div>
  );
}
