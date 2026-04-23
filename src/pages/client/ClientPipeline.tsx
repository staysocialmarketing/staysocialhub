import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadges } from "@/components/PlatformBadge";
import RequestChangesModal from "@/components/RequestChangesModal";
import { toast } from "sonner";
import {
  CheckCircle,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  Clock,
  CalendarCheck,
  Send,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

// ─── Stage config ─────────────────────────────────────────────────────────────

const IN_PROGRESS_STATUSES: PostStatus[] = [
  "in_progress",
  "writing",
  "design",
  "request_changes",
] as PostStatus[];

const STAGES = [
  {
    key: "in_progress",
    label: "In Progress",
    description: "Content being worked on",
    icon: <Zap className="h-4 w-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    statuses: IN_PROGRESS_STATUSES,
  },
  {
    key: "client_approval",
    label: "Content for Approval",
    description: "Needs your review",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    statuses: ["client_approval"] as PostStatus[],
    hasActions: true,
  },
  {
    key: "in_queue",
    label: "In Queue",
    description: "Approved & ready to go",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    statuses: ["approved", "ready_to_schedule", "scheduled"] as PostStatus[],
  },
  {
    key: "posted",
    label: "Posted",
    description: "Live and published",
    icon: <Send className="h-4 w-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    statuses: ["published"] as PostStatus[],
  },
] as const;

// ─── Post Card ────────────────────────────────────────────────────────────────

function PipelineCard({
  post,
  showActions,
  canApprove,
}: {
  post: any;
  showActions?: boolean;
  canApprove?: boolean;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [changesOpen, setChangesOpen] = useState(false);

  const thumbnail =
    post.creative_url ||
    (post.post_images && post.post_images.length > 0
      ? post.post_images[0].url
      : null);

  const approve = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const { error: insertError } = await supabase.from("approvals").insert({
        post_id: post.id,
        user_id: profile.id,
        type: "approve" as any,
      });
      if (insertError) throw insertError;
      const { data, error } = await supabase
        .from("posts")
        .update({ status_column: "approved" as PostStatus } as any)
        .eq("id", post.id)
        .eq("status_column", "client_approval")
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("POST_ALREADY_MOVED");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-pipeline"] });
      toast.success("Approved! Content is now in queue.");
    },
    onError: (err: any) => {
      if (err.message === "POST_ALREADY_MOVED") {
        toast.error("Post status has already changed — refresh to see the latest.");
      } else {
        toast.error(err.message || "Failed to approve");
      }
    },
  });

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-all duration-200 group"
        onClick={() => navigate(`/approvals/${post.id}`)}
      >
        <CardContent className="p-0">
          {/* Thumbnail */}
          {thumbnail ? (
            <div className="aspect-video rounded-t-xl overflow-hidden bg-muted">
              <img
                src={thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-t-xl bg-muted/60 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          <div className="p-3 space-y-2">
            {/* Title */}
            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
              {post.title}
            </h4>

            {/* Platform badges */}
            {post.platform && (
              <PlatformBadges platformStr={post.platform} />
            )}

            {/* Scheduled date if present */}
            {post.scheduled_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarCheck className="h-3 w-3" />
                <span>
                  {new Date(post.scheduled_at).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Action buttons — only for "Content for Approval" stage */}
            {showActions && canApprove && (
              <div
                className="flex gap-2 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  className="flex-1 gap-1 min-h-[40px] text-xs"
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending}
                >
                  {approve.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 min-h-[40px] text-xs"
                  onClick={() => setChangesOpen(true)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Changes
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <RequestChangesModal
        postId={post.id}
        postTitle={post.title}
        open={changesOpen}
        onOpenChange={setChangesOpen}
      />
    </>
  );
}

// ─── Stage Column ─────────────────────────────────────────────────────────────

function StageColumn({
  stage,
  posts,
  canApprove,
}: {
  stage: (typeof STAGES)[number];
  posts: any[];
  canApprove: boolean;
}) {
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      {/* Column header */}
      <div
        className={cn(
          "rounded-xl border p-3 mb-3 flex items-center gap-2",
          stage.bgColor,
          stage.borderColor
        )}
      >
        <span className={stage.color}>{stage.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-sm font-bold", stage.color)}>
              {stage.label}
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] h-4 px-1.5 shrink-0"
            >
              {posts.length}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {stage.description}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {posts.length === 0 ? (
          <div className="flex-1 rounded-xl border-2 border-dashed border-muted flex items-center justify-center py-10 text-center px-4">
            <p className="text-xs text-muted-foreground">Nothing here yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <PipelineCard
              key={post.id}
              post={post}
              showActions={"hasActions" in stage && stage.hasActions}
              canApprove={canApprove}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientPipeline() {
  const { profile, isClientAdmin, isClientAssistant } = useAuth();

  const { data: clientSettings } = useQuery({
    queryKey: ["client-settings-pipeline", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase
        .from("clients")
        .select("assistants_can_approve")
        .eq("id", profile.client_id)
        .single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const canApprove =
    isClientAdmin ||
    (isClientAssistant && !!clientSettings?.assistants_can_approve);

  const allStatuses = STAGES.flatMap((s) => s.statuses as PostStatus[]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["client-pipeline", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, platform, status_column, scheduled_at, creative_url, post_images(url, position)")
        .eq("client_id", profile.client_id)
        .in("status_column", allStatuses)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Sort post_images by position so primary image is first
      return (data || []).map((p: any) => ({
        ...p,
        post_images: (p.post_images || []).sort(
          (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
        ),
      }));
    },
    enabled: !!profile?.client_id,
  });

  const getPostsForStage = (stage: (typeof STAGES)[number]) =>
    posts.filter((p: any) =>
      (stage.statuses as readonly string[]).includes(p.status_column)
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Content Pipeline
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your content from creation to publication
        </p>
      </div>

      {/* Kanban columns — horizontal scroll on small screens */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            posts={getPostsForStage(stage)}
            canApprove={canApprove}
          />
        ))}
      </div>
    </div>
  );
}
