import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare, Calendar, Image as ImageIcon, Hash, Clock, CheckCircle, Mail, Eye, Send, CalendarClock,
} from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import ApprovalActions from "@/components/ApprovalActions";
import ApprovalBatchManager from "@/components/ApprovalBatchManager";
import ImageLightbox from "@/components/ImageLightbox";
import { PlatformBadges } from "@/components/PlatformBadge";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

type PostStatus = Database["public"]["Enums"]["post_status"];


function getDueDateColor(dueAt: string | null) {
  if (!dueAt) return null;
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(new Date());
  if (due < today) return "text-destructive";
  if (isToday(due)) return "text-warning";
  return "text-muted-foreground";
}

function PostCard({ post, onClick, showClient = false, children }: {
  post: any; onClick?: () => void; showClient?: boolean; children?: React.ReactNode;
}) {
  const dueDateColor = getDueDateColor(post.due_at);
  const isEmail = post.content_type === "email_campaign";
  const isCoreyReview = post.status_column === "corey_review";
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="card-elevated p-3 space-y-2.5 cursor-pointer hover:shadow-lifted transition-all" onClick={onClick}>
            {isCoreyReview && (
              <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">
                <Eye className="h-3 w-3 mr-1" />Corey Review
              </Badge>
            )}
            {post.creative_url ? (
              <button
                className="aspect-video bg-muted rounded-xl overflow-hidden w-full hover:opacity-90 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setLightboxUrl(post.creative_url); }}
              >
                <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className="aspect-video bg-muted/50 rounded-xl flex items-center justify-center">
                {isEmail ? <Mail className="h-6 w-6 text-muted-foreground/30" /> : <ImageIcon className="h-6 w-6 text-muted-foreground/30" />}
              </div>
            )}
            <h4 className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</h4>
            {isEmail && post.subject_line && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1">Subject: {post.subject_line}</p>
            )}
            {showClient && post.clients?.name && (
              <Badge variant="outline" className="text-[10px]">{post.clients.name}</Badge>
            )}
            <div className="flex flex-wrap gap-1">
              {(() => {
                const pc = (post as any).platform_content as Record<string, any> | null;
                const platformKeys = pc && Object.keys(pc).length > 0 ? Object.keys(pc) : null;
                const platformValue = platformKeys ?? post.platform ?? (isEmail ? "email" : null);
                return platformValue ? <PlatformBadges platformStr={platformValue} /> : null;
              })()}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {post.due_at && (
                  <span className={cn("flex items-center gap-1", dueDateColor)}>
                    <Clock className="h-3 w-3" />{format(new Date(post.due_at), "MMM d")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : "TBD"}
                </span>
              </div>
              {(post.comments?.length || 0) > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />{post.comments.length}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[250px]">
          <p className="text-xs line-clamp-3">{post.caption ? post.caption.substring(0, 120) + (post.caption.length > 120 ? "…" : "") : isEmail && post.subject_line ? post.subject_line : "No caption"}</p>
          {post.hashtags && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Hash className="h-3 w-3" />{post.hashtags.split(/\s+/).length} tags</p>}
        </TooltipContent>
      </Tooltip>
      {children}
      <ImageLightbox
        open={!!lightboxUrl}
        onOpenChange={(o) => { if (!o) setLightboxUrl(null); }}
        imageUrl={lightboxUrl}
      />
    </div>
  );
}

// ─── STRATEGIC COMMENT ─────────────────────────────────────────────
function StrategicCommentButton({ postId, postTitle }: { postId: string; postTitle: string }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!profile || !comment.trim()) return;
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: profile.id,
        body: `[Strategic Comment] ${comment.trim()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      toast.success("Strategic comment added");
      setComment("");
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="w-full text-xs gap-1 mt-1 rounded-xl" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <MessageSquare className="h-3 w-3" /> Strategic Comment
      </Button>
    );
  }

  return (
    <div className="space-y-2 mt-1" onClick={(e) => e.stopPropagation()}>
      <Textarea placeholder="Leave strategic direction…" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="text-xs" />
      <div className="flex gap-1">
        <Button size="sm" className="flex-1 text-xs rounded-xl" onClick={() => submit.mutate()} disabled={!comment.trim() || submit.isPending}>Send</Button>
        <Button size="sm" variant="ghost" className="text-xs rounded-xl" onClick={() => { setOpen(false); setComment(""); }}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── MARK AS SCHEDULED (admin only) ────────────────────────────────
function MarkAsScheduledButton({ postId }: { postId: string }) {
  const queryClient = useQueryClient();

  const markScheduled = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .update({ status_column: "scheduled" as PostStatus })
        .eq("id", postId)
        .eq("status_column", "approved")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Post not found or already past approved state");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      toast.success("Marked as scheduled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full gap-1.5 mt-1 text-xs rounded-xl border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
      onClick={(e) => { e.stopPropagation(); markScheduled.mutate(); }}
      disabled={markScheduled.isPending}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      Mark as Scheduled
    </Button>
  );
}

function SectionBlock({ title, icon, count, children }: { title: string; icon?: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
        <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function AdminApprovals() {
  const navigate = useNavigate();
  const { isSSAdmin } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["approval-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), assigned_user:assigned_to_user_id(name), clients(name)")
        .in("status_column", ["internal_review", "corey_review", "ready_for_client_batch", "client_approval", "approved", "ready_to_schedule", "ready_to_send", "scheduled", "published", "sent", "complete"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const internalReview = posts.filter((p: any) => p.status_column === "internal_review");
  const coreyReview = posts.filter((p: any) => p.status_column === "corey_review");
  const readyForClientBatch = posts.filter((p: any) => p.status_column === "ready_for_client_batch");
  const clientApproval = posts.filter((p: any) => p.status_column === "client_approval");
  const approvedPosts = posts.filter((p: any) => p.status_column === "approved");
  const readyToSchedule = posts.filter((p: any) => p.status_column === "ready_to_schedule");
  const readyToSend = posts.filter((p: any) => p.status_column === "ready_to_send");
  const scheduled = posts.filter((p: any) => p.status_column === "scheduled");
  const published = posts.filter((p: any) => p.status_column === "published" && p.request_id);
  const sent = posts.filter((p: any) => p.status_column === "sent");
  const complete = posts.filter((p: any) => p.status_column === "complete");

  if (isLoading) return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const renderGrid = (items: any[], showActions = false, showCorey = false) => (
    items.length === 0 ? (
      <EmptyState title="Nothing here yet" compact />
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((post: any) => (
          <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient>
            {showActions && <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />}
            {showCorey && isSSAdmin && (
              <>
                <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
                <StrategicCommentButton postId={post.id} postTitle={post.title} />
              </>
            )}
          </PostCard>
        ))}
      </div>
    )
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-1">Review team work and track client approvals</p>
      </div>

      {internalReview.length > 0 && (
        <SectionBlock title="Internal Review" icon={<CheckCircle className="h-5 w-5 text-primary" />} count={internalReview.length}>
          {renderGrid(internalReview, false)}
        </SectionBlock>
      )}

      <SectionBlock title="Corey Review" icon={<Eye className="h-5 w-5 text-amber-500" />} count={coreyReview.length}>
        {renderGrid(coreyReview, false, true)}
      </SectionBlock>

      <SectionBlock title="Approval Batches" icon={<Send className="h-5 w-5 text-primary" />} count={readyForClientBatch.length}>
        <ApprovalBatchManager
          unbatchedPosts={readyForClientBatch}
          allPosts={posts.map((p: any) => ({ id: p.id, status_column: p.status_column }))}
        />
      </SectionBlock>

      <SectionBlock title="Client Approval" count={clientApproval.length}>
        {renderGrid(clientApproval, true)}
      </SectionBlock>

      {approvedPosts.length > 0 && (
        <SectionBlock title="Approved — Awaiting Schedule" icon={<CalendarClock className="h-5 w-5 text-blue-500" />} count={approvedPosts.length}>
          {approvedPosts.length === 0 ? (
            <EmptyState title="Nothing here yet" compact />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {approvedPosts.map((post: any) => (
                <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient>
                  {isSSAdmin && <MarkAsScheduledButton postId={post.id} />}
                </PostCard>
              ))}
            </div>
          )}
        </SectionBlock>
      )}

      {readyToSchedule.length > 0 && (
        <SectionBlock title="Ready to Schedule" icon={<Calendar className="h-5 w-5 text-primary" />} count={readyToSchedule.length}>
          {renderGrid(readyToSchedule)}
        </SectionBlock>
      )}

      {readyToSend.length > 0 && (
        <SectionBlock title="Ready to Send" icon={<Mail className="h-5 w-5 text-primary" />} count={readyToSend.length}>
          {renderGrid(readyToSend)}
        </SectionBlock>
      )}

      {scheduled.length > 0 && (
        <SectionBlock title="Scheduled" count={scheduled.length}>
          {renderGrid(scheduled)}
        </SectionBlock>
      )}

      {published.length > 0 && (
        <SectionBlock title="Published" count={published.length}>
          {renderGrid(published)}
        </SectionBlock>
      )}

      {sent.length > 0 && (
        <SectionBlock title="Sent Campaigns" icon={<Mail className="h-5 w-5 text-primary" />} count={sent.length}>
          {renderGrid(sent)}
        </SectionBlock>
      )}

      {complete.length > 0 && (
        <SectionBlock title="Complete" count={complete.length}>
          {renderGrid(complete)}
        </SectionBlock>
      )}
    </div>
  );
}

// ─── CLIENT APPROVALS VIEW ─────────────────────────────────────────
function ClientApprovals() {
  const { profile, isClientAdmin, isClientAssistant } = useAuth();
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["client-approval-posts", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), clients(name)")
        .eq("client_id", profile.client_id)
        .in("status_column", ["client_approval", "scheduled", "published", "sent", "complete"])
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

  const canApprove = isClientAdmin || (isClientAssistant && clientSettings?.assistants_can_approve);

  const forApproval = posts.filter((p: any) => p.status_column === "client_approval");
  const scheduled = posts.filter((p: any) => p.status_column === "scheduled");
  const published = posts.filter((p: any) => p.status_column === "published");
  const sentCampaigns = posts.filter((p: any) => p.status_column === "sent" && p.content_type === "email_campaign");
  const completed = posts.filter((p: any) => p.status_column === "complete");

  if (isLoading) return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve your content</p>
      </div>

      <SectionBlock title="Content for Approval" count={forApproval.length}>
        {forApproval.length === 0 ? (
          <EmptyState title="No content awaiting your approval ✨" compact />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forApproval.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)}>
                {canApprove && (
                  <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
                )}
              </PostCard>
            ))}
          </div>
        )}
      </SectionBlock>

      {scheduled.length > 0 && (
        <SectionBlock title="Scheduled" count={scheduled.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scheduled.map((post: any) => <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />)}
          </div>
        </SectionBlock>
      )}

      {published.length > 0 && (
        <SectionBlock title="Published" count={published.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {published.map((post: any) => <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />)}
          </div>
        </SectionBlock>
      )}

      {sentCampaigns.length > 0 && (
        <SectionBlock title="Sent Campaigns" icon={<Mail className="h-5 w-5 text-primary" />} count={sentCampaigns.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sentCampaigns.map((post: any) => <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />)}
          </div>
        </SectionBlock>
      )}

      {completed.length > 0 && (
        <SectionBlock title="Completed" count={completed.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {completed.map((post: any) => <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />)}
          </div>
        </SectionBlock>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────
export default function Approvals() {
  const { isSSRole } = useAuth();
  return isSSRole ? <AdminApprovals /> : <ClientApprovals />;
}

