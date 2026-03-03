import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MessageSquare, Calendar, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
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

export default function Approvals() {
  const { profile, isSSRole, isClientAdmin, isClientAssistant } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: clientSettings } = useQuery({
    queryKey: ["client-settings", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase.from("clients").select("assistants_can_approve").eq("id", profile.client_id).single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const movePost = useMutation({
    mutationFn: async ({ postId, newStatus }: { postId: string; newStatus: PostStatus }) => {
      const { error } = await supabase.from("posts").update({ status_column: newStatus }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post moved successfully");
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading approvals board...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Social Approvals</h2>
        <p className="text-muted-foreground">Drag and drop cards to update status</p>
      </div>

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
                    <Card
                      key={post.id}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id, post.status_column)}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
