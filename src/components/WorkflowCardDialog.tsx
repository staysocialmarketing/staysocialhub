import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { CheckCircle2, Clock, ExternalLink, FileText, Pencil, Send, Calendar, Image as ImageIcon, Trash2 } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import { toast } from "sonner";
import { format } from "date-fns";
import ApprovalActions from "@/components/ApprovalActions";
import { CONTENT_TYPE_OPTIONS, AUDIENCE_OPTIONS, getContentCategory } from "@/lib/workflowUtils";
import { Constants } from "@/integrations/supabase/types";

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "X / Twitter", "Pinterest", "YouTube", "Google"];
const POST_STATUSES = Constants.public.Enums.post_status;

interface WorkflowCardDialogProps {
  post: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssUsers: any[];
}

export default function WorkflowCardDialog({ post, open, onOpenChange, ssUsers }: WorkflowCardDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSSAdmin, isSSManager, isSSRole, isClientAdmin, isClientAssistant } = useAuth();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption || "");
  const [contentType, setContentType] = useState(post.content_type || "");
  const [assignedTo, setAssignedTo] = useState(post.assigned_to_user_id || "");
  const [reviewer, setReviewer] = useState(post.reviewer_user_id || "");
  const [dueAt, setDueAt] = useState<Date | null>(post.due_at ? new Date(post.due_at) : null);
  const [hashtags, setHashtags] = useState(post.hashtags || "");
  const [internalNotes, setInternalNotes] = useState(post.internal_notes || "");
  const [platforms, setPlatforms] = useState<string[]>(post.platform ? post.platform.split(",").map((p: string) => p.trim()) : []);
  const [statusOverride, setStatusOverride] = useState(post.status_column || "idea");
  // Email fields
  const [subjectLine, setSubjectLine] = useState(post.subject_line || "");
  const [previewText, setPreviewText] = useState(post.preview_text || "");
  const [emailBody, setEmailBody] = useState(post.email_body || "");
  const [audience, setAudience] = useState(post.audience || "");
  const [campaignLink, setCampaignLink] = useState(post.campaign_link || "");
  // Linked request fields
  const [reqType, setReqType] = useState("");
  const [reqPriority, setReqPriority] = useState("");
  const [reqStatus, setReqStatus] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isEmail = contentType === "email_campaign";

  const { data: linkedRequest } = useQuery({
    queryKey: ["linked-request", post.request_id],
    queryFn: async () => {
      if (!post.request_id) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, request_notes, content_type, status_column, priority")
        .eq("id", post.request_id)
        .single();
      if (error) return null;
      // Init request edit fields
      if (data) {
        setReqType((data as any).content_type || "");
        setReqPriority((data as any).priority || "normal");
        setReqStatus((data as any).status_column || "open");
      }
      return data;
    },
    enabled: !!post.request_id,
  });

  const { data: postImages = [] } = useQuery({
    queryKey: ["post-images-dialog", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_images")
        .select("url, alt_text, position")
        .eq("post_id", post.id)
        .order("position", { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  const imagesToShow: string[] = postImages.length > 0
    ? postImages.map((img: any) => img.url)
    : post.creative_url ? [post.creative_url] : [];

  const resetFields = () => {
    setTitle(post.title);
    setCaption(post.caption || "");
    setContentType(post.content_type || "");
    setAssignedTo(post.assigned_to_user_id || "");
    setReviewer(post.reviewer_user_id || "");
    setDueAt(post.due_at ? new Date(post.due_at) : null);
    setHashtags(post.hashtags || "");
    setInternalNotes(post.internal_notes || "");
    setPlatforms(post.platform ? post.platform.split(",").map((p: string) => p.trim()) : []);
    setStatusOverride(post.status_column || "idea");
    setSubjectLine(post.subject_line || "");
    setPreviewText(post.preview_text || "");
    setEmailBody(post.email_body || "");
    setAudience(post.audience || "");
    setCampaignLink(post.campaign_link || "");
    if (linkedRequest) {
      setReqType((linkedRequest as any).content_type || "");
      setReqPriority((linkedRequest as any).priority || "normal");
      setReqStatus((linkedRequest as any).status_column || "open");
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const updatePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({
          title,
          caption: isEmail ? null : (caption || null),
          content_type: contentType || null,
          assigned_to_user_id: assignedTo || null,
          reviewer_user_id: reviewer || null,
          due_at: dueAt?.toISOString() || null,
          hashtags: hashtags || null,
          internal_notes: internalNotes || null,
          platform: platforms.length > 0 ? platforms.join(", ") : null,
          status_column: statusOverride as any,
          subject_line: isEmail ? (subjectLine || null) : null,
          preview_text: isEmail ? (previewText || null) : null,
          email_body: isEmail ? (emailBody || null) : null,
          audience: isEmail ? (audience || null) : null,
          campaign_link: campaignLink || null,
        } as any)
        .eq("id", post.id);
      if (error) throw error;

      // Update linked request if exists (requests are now stored as posts)
      if (post.request_id && linkedRequest) {
        const { error: reqError } = await supabase
          .from("posts")
          .update({
            content_type: reqType || null,
            priority: reqPriority || null,
            status_column: reqStatus as any,
          } as any)
          .eq("id", post.request_id);
        if (reqError) console.error("Failed to update linked request:", reqError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["linked-request", post.request_id] });
      toast.success("Post updated");
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post deleted");
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete post"),
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").update({
        status_column: "sent" as any,
        send_date: new Date().toISOString(),
      } as any).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Campaign sent!");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to send"),
  });

  const scheduleEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").update({
        status_column: "scheduled" as any,
      } as any).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Campaign scheduled!");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to schedule"),
  });

  const markPosted = useMutation({
    mutationFn: async () => {
      const isEmail = getContentCategory(post.content_type) === "email";
      const newStatus = isEmail ? "sent" : "published";
      const { error } = await supabase
        .from("posts")
        .update({ status_column: newStatus as any } as any)
        .eq("id", post.id);
      if (error) throw error;
      return isEmail;
    },
    onSuccess: (isEmail) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-posts"] });
      toast.success(isEmail ? "Email marked as sent" : "Post marked as published");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const showAdminApproval = isSSAdmin && post.status_column === "corey_review";
  const showClientApproval = (isClientAdmin || isClientAssistant) && post.status_column === "client_approval";
  const showSendActions = isSSAdmin && post.status_column === "ready_to_send";
  const alreadyPosted = post.status_column === "published" || post.status_column === "sent" || post.status_column === "complete";
  const showMarkPosted = (isSSAdmin || isSSManager) && !alreadyPosted;

  const getUserName = (userId: string) => {
    const u = ssUsers.find((u: any) => u.id === userId);
    return u?.name || u?.email || "—";
  };

  const contentTypeLabel = CONTENT_TYPE_OPTIONS.find(t => t.value === contentType)?.label || contentType || "—";

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditing(false); resetFields(); } onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? "Edit Post" : post.title}
            {post.request_id && (
              <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground">
                <FileText className="h-3 w-3 mr-1" />From Request
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {showMarkPosted && (
            <div className="rounded-md border border-green-500/30 bg-green-50 dark:bg-green-950/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {getContentCategory(post.content_type) === "email" ? "Mark as Sent" : "Mark as Posted"}
              </p>
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => markPosted.mutate()}
                disabled={markPosted.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {getContentCategory(post.content_type) === "email" ? "Email Sent" : "Post is Live"}
              </Button>
            </div>
          )}

          {imagesToShow.length > 0 && (
            <div className={imagesToShow.length === 1 ? "w-full" : "grid grid-cols-2 gap-2"}>
              {imagesToShow.map((url: string, i: number) => (
                <button
                  key={i}
                  className="aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-90 transition-opacity w-full"
                  onClick={() => setLightboxUrl(url)}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Approval actions */}
          {showAdminApproval && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Internal Review</p>
              <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
            </div>
          )}
          {showClientApproval && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Your Approval</p>
              <ApprovalActions postId={post.id} postTitle={post.title} currentStatus={post.status_column} contentType={post.content_type} />
            </div>
          )}

          {/* Send Actions for Ready to Send */}
          {showSendActions && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Send Options</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1" onClick={() => sendNow.mutate()} disabled={sendNow.isPending}>
                  <Send className="h-3.5 w-3.5" />Send Now
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => scheduleEmail.mutate()} disabled={scheduleEmail.isPending}>
                  <Calendar className="h-3.5 w-3.5" />Schedule
                </Button>
              </div>
            </div>
          )}

          {editing ? (
            /* ---- EDIT MODE ---- */
            <>
              <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>

              <div>
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{CONTENT_TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={statusOverride} onValueChange={setStatusOverride}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEmail ? (
                <>
                  <div><Label>Subject Line</Label><Input value={subjectLine} onChange={e => setSubjectLine(e.target.value)} placeholder="Email subject" /></div>
                  <div><Label>Preview Text</Label><Input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Inbox preview text" /></div>
                  <div><Label>Email Body</Label><Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={4} placeholder="Email content..." /></div>
                  <div>
                    <Label>Audience</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                      <SelectContent>{AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Campaign Link</Label><Input value={campaignLink} onChange={e => setCampaignLink(e.target.value)} placeholder="https://..." /></div>
                </>
              ) : (
                <div><Label>Caption / Description</Label><Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} /></div>
              )}

              {/* Platform checkboxes */}
              {!isEmail && (
                <div>
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {PLATFORM_OPTIONS.map(p => (
                      <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div><Label>Hashtags</Label><Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#socialmedia #marketing" /></div>

              <div><Label>Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Internal team notes..." /></div>

              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Clock className="h-4 w-4 mr-2" />{dueAt ? format(dueAt, "PPP") : "Pick a due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarWidget mode="single" selected={dueAt || undefined} onSelect={d => setDueAt(d || null)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assigned to</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>{ssUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reviewer</Label>
                  <Select value={reviewer} onValueChange={setReviewer}>
                    <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                    <SelectContent>{ssUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linked Request Edit */}
              {linkedRequest && (
                <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original Request</p>
                  <p className="text-sm font-medium">{(linkedRequest as any).title}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={reqType} onValueChange={setReqType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="social_post">Social Post</SelectItem>
                          <SelectItem value="email_campaign">Email Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select value={reqPriority} onValueChange={setReqPriority}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={reqStatus} onValueChange={setReqStatus}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => updatePost.mutate()} disabled={!title || updatePost.isPending}>
                  {updatePost.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); resetFields(); }}>Cancel</Button>
              </div>
            </>
          ) : (
            /* ---- READ-ONLY MODE ---- */
            <>
              {post.clients?.name && (
                <div>
                  <Label className="text-muted-foreground text-xs">Client</Label>
                  <p className="text-sm font-medium">{post.clients.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Content Type</Label>
                  <p className="text-sm font-medium">{contentTypeLabel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p className="text-sm font-medium">{post.status_column?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Due Date</Label>
                  <p className="text-sm font-medium">{post.due_at ? format(new Date(post.due_at), "PPP") : "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned to</Label>
                  <p className="text-sm font-medium">{post.assigned_to_user_id ? getUserName(post.assigned_to_user_id) : "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Reviewer</Label>
                  <p className="text-sm font-medium">{post.reviewer_user_id ? getUserName(post.reviewer_user_id) : "—"}</p>
                </div>
              </div>

              {/* Email-specific read-only fields */}
              {post.content_type === "email_campaign" && (
                <div className="space-y-3">
                  {post.subject_line && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Subject Line</Label>
                      <p className="text-sm font-medium">{post.subject_line}</p>
                    </div>
                  )}
                  {post.preview_text && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Preview Text</Label>
                      <p className="text-sm">{post.preview_text}</p>
                    </div>
                  )}
                  {post.email_body && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Email Body</Label>
                      <p className="text-sm whitespace-pre-wrap">{post.email_body}</p>
                    </div>
                  )}
                  {post.audience && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Audience</Label>
                      <p className="text-sm font-medium">{post.audience}</p>
                    </div>
                  )}
                  {post.send_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Send Date</Label>
                      <p className="text-sm font-medium">{format(new Date(post.send_date), "PPP")}</p>
                    </div>
                  )}
                  {post.campaign_link && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Campaign Link</Label>
                      <a href={post.campaign_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{post.campaign_link}</a>
                    </div>
                  )}
                </div>
              )}

              {/* Social caption */}
              {post.content_type !== "email_campaign" && (post.caption) && (
                <div>
                  <Label className="text-muted-foreground text-xs">Caption / Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                </div>
              )}

              {post.platform && (
                <div>
                  <Label className="text-muted-foreground text-xs">Platforms</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {post.platform.split(",").map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {post.hashtags && (
                <div>
                  <Label className="text-muted-foreground text-xs">Hashtags</Label>
                  <p className="text-sm">{post.hashtags}</p>
                </div>
              )}

              {isSSRole && post.internal_notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Internal Notes</Label>
                  <p className="text-sm whitespace-pre-wrap">{post.internal_notes}</p>
                </div>
              )}

              {linkedRequest && (
                <div className="rounded-md border border-border p-3 space-y-1 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original Request</p>
                  <p className="text-sm font-medium">{(linkedRequest as any).title}</p>
                  {(linkedRequest as any).request_notes && <p className="text-xs text-muted-foreground">{(linkedRequest as any).request_notes}</p>}
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{(linkedRequest as any).content_type?.replace("_", " ")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{(linkedRequest as any).status_column}</Badge>
                    {(linkedRequest as any).priority && <Badge variant="outline" className="text-[10px]">{(linkedRequest as any).priority}</Badge>}
                  </div>
                </div>
              )}

<div className="flex items-center justify-between gap-2 pt-2">
                <div>
                  {isSSAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />Delete Post
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isSSRole && (
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />Edit
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { onOpenChange(false); navigate(`/workflow/${post.id}`); }}>
                    <ExternalLink className="h-4 w-4 mr-2" />Full View
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletePost.mutate()}
            disabled={deletePost.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletePost.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <ImageLightbox
      open={!!lightboxUrl}
      onOpenChange={(o) => { if (!o) setLightboxUrl(null); }}
      imageUrl={lightboxUrl}
    />
    </>
  );
}
