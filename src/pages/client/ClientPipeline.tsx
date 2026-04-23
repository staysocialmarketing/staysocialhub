import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PlatformBadge } from "@/components/PlatformBadge";
import ApprovalActions from "@/components/ApprovalActions";
import { Clock, RotateCcw, AlertCircle } from "lucide-react";
import { format, startOfDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CLIENT_PIPELINE_COLUMNS,
  getStatusesForClientColumn,
} from "@/lib/workflowUtils";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

const ALL_CLIENT_STATUSES = CLIENT_PIPELINE_COLUMNS
  .flatMap((col) => getStatusesForClientColumn(col.key)) as PostStatus[];

function getDueDateColor(dueAt: string | null) {
  if (!dueAt) return null;
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(new Date());
  if (due < today) return "text-destructive";
  if (isToday(due)) return "text-warning";
  return "text-muted-foreground";
}

function PipelineCard({
  post,
  showApprovalActions,
  canApprove,
}: {
  post: any;
  showApprovalActions: boolean;
  canApprove: boolean;
}) {
  const navigate = useNavigate();
  const dueDateColor = getDueDateColor(post.due_at);
  const platforms: string[] = (() => {
    const pc = post.platform_content as Record<string, any> | null;
    if (pc && Object.keys(pc).length > 0) return Object.keys(pc);
    return post.platform ? post.platform.split(",").map((p: string) => p.trim()) : [];
  })();

  return (
    <div className="space-y-1.5">
      <div
        className="card-elevated p-3 space-y-2 cursor-pointer hover:shadow-lifted transition-all"
        onClick={() => navigate(`/approvals/${post.id}`)}
      >
        {post.creative_url && (
          <div className="aspect-video bg-muted rounded-xl overflow-hidden">
            <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <h4 className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</h4>

        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {post.due_at && (
            <span className={cn("flex items-center gap-1", dueDateColor)}>
              <Clock className="h-3 w-3" />
              {format(new Date(post.due_at), "MMM d")}
            </span>
          )}
          {(post.revision_count ?? 0) > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] gap-0.5 border-0 bg-amber-500/10 text-amber-600 ml-auto"
            >
              <RotateCcw className="h-2.5 w-2.5" />R{post.revision_count}
            </Badge>
          )}
        </div>
      </div>

      {showApprovalActions && canApprove && (
        <ApprovalActions
          postId={post.id}
          postTitle={post.title}
          currentStatus={post.status_column}
          contentType={post.content_type}
        />
      )}
    </div>
  );
}

export default function ClientPipeline() {
  const { profile, isClientAdmin, isClientAssistant, isImpersonating } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const forApprovalRef = useRef<HTMLDivElement>(null);

  const clientId = globalClientId || profile?.client_id;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["client-pipeline-posts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id)")
        .eq("client_id", clientId)
        .in("status_column", ALL_CLIENT_STATUSES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: clientSettings } = useQuery({
    queryKey: ["client-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("clients")
        .select("assistants_can_approve")
        .eq("id", clientId)
        .single();
      return data;
    },
    enabled: !!clientId,
  });

  // isImpersonating = admin in View As mode — block approvals to prevent accidental actions
  const canApprove = !isImpersonating &&
    (isClientAdmin || (isClientAssistant && !!clientSettings?.assistants_can_approve));

  const forApprovalCount = posts.filter(
    (p: any) => p.status_column === "client_approval",
  ).length;

  const columnData = CLIENT_PIPELINE_COLUMNS.map((col) => ({
    ...col,
    posts: posts.filter((p: any) =>
      getStatusesForClientColumn(col.key).includes(p.status_column as PostStatus),
    ),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Content Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your content, from brief to posted
        </p>
      </div>

      {/* Approval banner */}
      {forApprovalCount > 0 && (
        <button
          type="button"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20 hover:bg-primary/12 transition-colors text-left w-full"
          onClick={() => forApprovalRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
        >
          <AlertCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {forApprovalCount} post{forApprovalCount !== 1 ? "s" : ""} ready for your review
            </p>
            <p className="text-xs text-muted-foreground">
              Tap to jump to the For Approval column
            </p>
          </div>
          <span className="text-xs font-medium text-primary shrink-0">Review →</span>
        </button>
      )}

      {/* Kanban */}
      <ScrollArea className="flex-1 min-h-0 -mx-4 sm:-mx-6">
        <div
          className="flex gap-3 px-4 sm:px-6 pb-4"
          style={{ minWidth: CLIENT_PIPELINE_COLUMNS.length * 272 }}
        >
          {columnData.map((col) => {
            const isForApproval = col.key === "for_approval";
            return (
              <div
                key={col.key}
                ref={isForApproval ? forApprovalRef : undefined}
                className="w-[256px] sm:w-[272px] shrink-0 flex flex-col bg-muted/30 rounded-2xl"
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] h-5 min-w-[20px] justify-center",
                      isForApproval && col.posts.length > 0 &&
                        "bg-primary/10 text-primary",
                    )}
                  >
                    {col.posts.length}
                  </Badge>
                </div>

                <div className="px-2 pb-3 space-y-2 flex-1 min-h-[100px]">
                  {col.posts.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground/40 border border-dashed border-muted-foreground/15 rounded-xl">
                      Nothing here yet
                    </div>
                  ) : (
                    col.posts.map((post: any) => (
                      <PipelineCard
                        key={post.id}
                        post={post}
                        showApprovalActions={isForApproval}
                        canApprove={canApprove}
                      />
                    ))
                  )}
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
