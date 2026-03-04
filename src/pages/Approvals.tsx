import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, Calendar, Image as ImageIcon, Hash, Clock, CheckCircle, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  facebook: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  tiktok: "bg-purple-100 text-purple-800",
};

function getDueDateColor(dueAt: string | null) {
  if (!dueAt) return null;
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(new Date());
  if (due < today) return "text-destructive";
  if (isToday(due)) return "text-warning";
  return "text-muted-foreground";
}

// ─── SHARED POST CARD ─────────────────────────────────────────────
function PostCard({
  post,
  draggable = false,
  onDragStart,
  onClick,
  showClient = false,
}: {
  post: any;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
  showClient?: boolean;
}) {
  const dueDateColor = getDueDateColor(post.due_at);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className={cn(
            "hover:shadow-md transition-shadow",
            draggable && "cursor-grab active:cursor-grabbing"
          )}
          draggable={draggable}
          onDragStart={onDragStart}
          onClick={onClick}
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
            {showClient && post.clients?.name && (
              <Badge variant="outline" className="text-[10px]">{post.clients.name}</Badge>
            )}
            <div className="flex flex-wrap gap-1">
              {post.platform?.split(",").map((p: string) => (
                <Badge key={p} variant="secondary" className={`text-[10px] ${platformColors[p.trim().toLowerCase()] || ""}`}>
                  {p.trim()}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {post.due_at && (
                  <span className={cn("flex items-center gap-1", dueDateColor)}>
                    <Clock className="h-3 w-3" />
                    {format(new Date(post.due_at), "MMM d")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : "TBD"}
                </span>
              </div>
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
  );
}

// ─── ADMIN APPROVALS VIEW ──────────────────────────────────────────
function AdminApprovals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["approval-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), assigned_user:assigned_to_user_id(name), clients(name)")
        .in("status_column", ["internal_review", "client_approval", "request_changes", "approved", "published"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const movePost = useMutation({
    mutationFn: async ({ postId, newStatus }: { postId: string; newStatus: PostStatus }) => {
      const { error } = await supabase.from("posts").update({ status_column: newStatus }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post updated");
    },
    onError: () => toast.error("Failed to update post"),
  });

  const teamPosts = posts.filter((p: any) => p.status_column === "internal_review");
  const clientApprovalPosts = posts.filter((p: any) => p.status_column === "client_approval");
  const requestChangesPosts = posts.filter((p: any) => p.status_column === "request_changes");
  const approvedPosts = posts.filter((p: any) => p.status_column === "approved");
  const publishedPosts = posts.filter((p: any) => p.status_column === "published");

  if (isLoading) {
    return <p className="text-muted-foreground p-6">Loading approvals...</p>;
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Approvals</h2>
        <p className="text-muted-foreground">Review team work and track client approvals</p>
      </div>

      {/* Section 1: Team Approvals */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Team Approvals
          <Badge variant="secondary">{teamPosts.length}</Badge>
        </h3>
        {teamPosts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No posts awaiting team review</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamPosts.map((post: any) => (
              <div key={post.id} className="space-y-2">
                <PostCard post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => movePost.mutate({ postId: post.id, newStatus: "client_approval" })}
                  >
                    Approve → Client
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => movePost.mutate({ postId: post.id, newStatus: "design" })}
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" /> Send Back
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Client Approvals Overview */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">Client Approvals Overview</h3>
        <ScrollArea>
          <div className="flex gap-4 pb-4" style={{ minWidth: 4 * 280 }}>
            {[
              { key: "client_approval", label: "Awaiting Client", posts: clientApprovalPosts },
              { key: "approved", label: "Approved", posts: approvedPosts },
              { key: "request_changes", label: "Changes Requested", posts: requestChangesPosts },
              { key: "published", label: "Published", posts: publishedPosts },
            ].map((col) => (
              <div key={col.key} className="w-[260px] shrink-0 flex flex-col bg-muted/50 rounded-lg">
                <div className="px-3 py-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</h4>
                  <Badge variant="secondary" className="text-xs">{col.posts.length}</Badge>
                </div>
                <div className="px-2 pb-2 space-y-2 flex-1 min-h-[80px]">
                  {col.posts.map((post: any) => (
                    <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}

// ─── CLIENT APPROVALS VIEW ─────────────────────────────────────────
function ClientApprovals() {
  const { profile, isClientAdmin, isClientAssistant } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["client-approval-posts", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), clients(name)")
        .eq("client_id", profile.client_id)
        .in("status_column", ["client_approval", "approved", "request_changes", "published"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.client_id,
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
      queryClient.invalidateQueries({ queryKey: ["client-approval-posts"] });
      toast.success("Post updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const canApprove = isClientAdmin || (isClientAssistant && clientSettings?.assistants_can_approve);

  const canClientMoveCard = (from: PostStatus, to: PostStatus) => {
    if (!canApprove) return false;
    return (
      (from === "client_approval" && to === "approved") ||
      (from === "client_approval" && to === "request_changes")
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

  const CLIENT_TOP_COLUMNS: { key: PostStatus; label: string }[] = [
    { key: "client_approval", label: "Content for Approval" },
    { key: "approved", label: "Approved" },
    { key: "request_changes", label: "Request Changes" },
  ];

  const publishedPosts = posts.filter((p: any) => p.status_column === "published");

  if (isLoading) {
    return <p className="text-muted-foreground p-6">Loading your approvals...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Approvals</h2>
        <p className="text-muted-foreground">Review and approve your content</p>
      </div>

      {/* Top 3 columns with drag-and-drop */}
      <ScrollArea>
        <div className="flex gap-4 pb-4" style={{ minWidth: 3 * 280 }}>
          {CLIENT_TOP_COLUMNS.map((col) => {
            const columnPosts = posts.filter((p: any) => p.status_column === col.key);
            return (
              <div
                key={col.key}
                className="w-[260px] shrink-0 flex flex-col bg-muted/50 rounded-lg"
                onDrop={(e) => handleDrop(e, col.key)}
                onDragOver={handleDragOver}
              >
                <div className="px-3 py-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{columnPosts.length}</Badge>
                </div>
                <div className="px-2 pb-2 space-y-2 flex-1 min-h-[100px]">
                  {columnPosts.map((post: any) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      draggable={col.key === "client_approval" && canApprove}
                      onDragStart={(e) => handleDragStart(e, post.id, post.status_column)}
                      onClick={() => navigate(`/approvals/${post.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Published section below */}
      {publishedPosts.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Published</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {publishedPosts.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────
export default function Approvals() {
  const { isSSRole } = useAuth();
  return isSSRole ? <AdminApprovals /> : <ClientApprovals />;
}
