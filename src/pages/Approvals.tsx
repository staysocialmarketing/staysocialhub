import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, Calendar, Image as ImageIcon, Hash, Clock, CheckCircle, Mail,
} from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import ApprovalActions from "@/components/ApprovalActions";

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

function PostCard({ post, onClick, showClient = false, children }: {
  post: any; onClick?: () => void; showClient?: boolean; children?: React.ReactNode;
}) {
  const dueDateColor = getDueDateColor(post.due_at);
  const isEmail = post.content_type === "email_campaign";
  return (
    <div className="space-y-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
            <CardContent className="p-3 space-y-2">
              {post.creative_url ? (
                <div className="aspect-video bg-muted rounded overflow-hidden">
                  <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded flex items-center justify-center">
                  {isEmail ? <Mail className="h-6 w-6 text-muted-foreground/40" /> : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
                </div>
              )}
              <h4 className="text-sm font-medium text-foreground line-clamp-2">{post.title}</h4>
              {isEmail && post.subject_line && (
                <p className="text-xs text-muted-foreground line-clamp-1">Subject: {post.subject_line}</p>
              )}
              {showClient && post.clients?.name && (
                <Badge variant="outline" className="text-[10px]">{post.clients.name}</Badge>
              )}
              <div className="flex flex-wrap gap-1">
                {post.platform?.split(",").map((p: string) => (
                  <Badge key={p} variant="secondary" className={`text-[10px] ${platformColors[p.trim().toLowerCase()] || ""}`}>{p.trim()}</Badge>
                ))}
                {isEmail && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800">Email Campaign</Badge>}
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
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />{post.comments?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[250px]">
          <p className="text-xs line-clamp-3">{post.caption ? post.caption.substring(0, 120) + (post.caption.length > 120 ? "…" : "") : isEmail && post.subject_line ? post.subject_line : "No caption"}</p>
          {post.hashtags && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Hash className="h-3 w-3" />{post.hashtags.split(/\s+/).length} tags</p>}
        </TooltipContent>
      </Tooltip>
      {children}
    </div>
  );
}

// ─── ADMIN APPROVALS VIEW ──────────────────────────────────────────
function AdminApprovals() {
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["approval-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, comments(id), assigned_user:assigned_to_user_id(name), clients(name)")
        .in("status_column", ["internal_review", "client_approval", "ready_to_schedule", "ready_to_send", "scheduled", "published", "sent", "complete"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const internalReview = posts.filter((p: any) => p.status_column === "internal_review");
  const clientApproval = posts.filter((p: any) => p.status_column === "client_approval");
  const readyToSend = posts.filter((p: any) => p.status_column === "ready_to_send");
  const scheduled = posts.filter((p: any) => p.status_column === "scheduled");
  const published = posts.filter((p: any) => p.status_column === "published" && p.request_id);
  const sent = posts.filter((p: any) => p.status_column === "sent");
  const complete = posts.filter((p: any) => p.status_column === "complete");

  if (isLoading) return <p className="text-muted-foreground p-6">Loading approvals...</p>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Approvals</h2>
        <p className="text-muted-foreground">Review team work and track client approvals</p>
      </div>

      {/* Internal Review */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Awaiting Internal Review
          <Badge variant="secondary">{internalReview.length}</Badge>
        </h3>
        {internalReview.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No posts awaiting review</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {internalReview.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient>
                <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
              </PostCard>
            ))}
          </div>
        )}
      </section>

      {/* Client Approval */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Awaiting Client Approval
          <Badge variant="secondary">{clientApproval.length}</Badge>
        </h3>
        {clientApproval.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No posts awaiting client approval</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clientApproval.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        )}
      </section>

      {/* Ready to Send (email campaigns) */}
      {readyToSend.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Ready to Send <Badge variant="secondary">{readyToSend.length}</Badge>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {readyToSend.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Scheduled <Badge variant="secondary">{scheduled.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scheduled.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        </section>
      )}

      {/* Published */}
      {published.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Published <Badge variant="secondary">{published.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {published.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        </section>
      )}

      {/* Sent Campaigns */}
      {sent.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Sent Campaigns <Badge variant="secondary">{sent.length}</Badge>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sent.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        </section>
      )}

      {/* Complete (other work types) */}
      {complete.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Complete <Badge variant="secondary">{complete.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {complete.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} showClient />
            ))}
          </div>
        </section>
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

  if (isLoading) return <p className="text-muted-foreground p-6">Loading your approvals...</p>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Approvals</h2>
        <p className="text-muted-foreground">Review and approve your content</p>
      </div>

      {/* Content for Approval */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Content for Approval
          <Badge variant="secondary">{forApproval.length}</Badge>
        </h3>
        {forApproval.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No content awaiting your approval</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forApproval.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)}>
                {canApprove && (
                  <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
                )}
              </PostCard>
            ))}
          </div>
        )}
      </section>

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Scheduled <Badge variant="secondary">{scheduled.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scheduled.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Published */}
      {published.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Published <Badge variant="secondary">{published.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {published.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Sent Campaigns */}
      {sentCampaigns.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Sent Campaigns <Badge variant="secondary">{sentCampaigns.length}</Badge>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sentCampaigns.map((post: any) => (
              <PostCard key={post.id} post={post} onClick={() => navigate(`/approvals/${post.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Complete */}
      {completed.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-3">Completed <Badge variant="secondary">{completed.length}</Badge></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {completed.map((post: any) => (
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
