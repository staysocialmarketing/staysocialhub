import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Hash, MessageSquare, Image as ImageIcon,
  Check, FileEdit, AlertTriangle, Save, Upload,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ApprovalType = Database["public"]["Enums"]["approval_type"];

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { profile, isSSRole, isClientAdmin, isClientAssistant } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<ApprovalType | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [lightboxVersion, setLightboxVersion] = useState<any>(null);

  // Fetch post
  const { data: post, isLoading } = useQuery({
    queryKey: ["post-detail", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name, assistants_can_approve)")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  // Fetch versions
  const { data: versions = [] } = useQuery({
    queryKey: ["post-versions", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_versions")
        .select("*, users:created_by_user_id(name)")
        .eq("post_id", postId!)
        .order("version_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users:user_id(name, email)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Fetch approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["post-approvals", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("*, users:user_id(name, email)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!postId,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const { error } = await supabase.from("comments").insert({
        post_id: postId!,
        user_id: profile.id,
        body: commentText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      setCommentText("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Save internal notes
  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({ internal_notes: internalNotes } as any)
        .eq("id", postId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success("Internal notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  // Submit approval
  const submitApproval = useMutation({
    mutationFn: async () => {
      if (!profile || !approvalDialog) throw new Error("Missing data");
      const { error: approvalError } = await supabase.from("approvals").insert({
        post_id: postId!,
        user_id: profile.id,
        type: approvalDialog,
        note: approvalNote || null,
      });
      if (approvalError) throw approvalError;

      const newStatus = approvalDialog === "request_changes" ? "request_changes" : "approved";
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status_column: newStatus })
        .eq("id", postId!);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-approvals", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setApprovalDialog(null);
      setApprovalNote("");
      toast.success(
        approvalDialog === "request_changes"
          ? "Changes requested"
          : "Post approved!"
      );
    },
    onError: () => toast.error("Failed to submit approval"),
  });

  // Upload new version
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const uploadNewVersion = async (file: File, caption?: string, hashtags?: string) => {
    if (!profile || !postId) return;
    setUploadingVersion(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${postId}/v${versions.length + 1}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("creative-assets")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("creative-assets")
        .getPublicUrl(path);

      const { error: versionError } = await supabase.from("post_versions").insert({
        post_id: postId,
        version_number: versions.length + 1,
        creative_url: urlData.publicUrl,
        caption: caption || null,
        hashtags: hashtags || null,
        created_by_user_id: profile.id,
      });
      if (versionError) throw versionError;

      // Update post with latest version data
      await supabase.from("posts").update({
        creative_url: urlData.publicUrl,
        ...(caption ? { caption } : {}),
        ...(hashtags ? { hashtags } : {}),
      }).eq("id", postId);

      queryClient.invalidateQueries({ queryKey: ["post-versions", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", postId] });
      toast.success(`Version ${versions.length + 1} uploaded`);
    } catch {
      toast.error("Failed to upload version");
    } finally {
      setUploadingVersion(false);
    }
  };

  if (isLoading) {
    return <div className="p-6"><p className="text-muted-foreground">Loading post...</p></div>;
  }

  if (!post) {
    return <div className="p-6"><p className="text-muted-foreground">Post not found.</p></div>;
  }

  const latestApproval = approvals[0];
  const canApprove = isClientAdmin || (isClientAssistant && (post as any).clients?.assistants_can_approve);
  const isApprovalStatus = post.status_column === "client_approval";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/approvals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground truncate">{post.title}</h2>
          <p className="text-sm text-muted-foreground">
            {(post as any).clients?.name} · {post.platform || "No platform"}
          </p>
        </div>
        {latestApproval && (
          <Badge
            className={
              latestApproval.type === "approve"
                ? "bg-green-100 text-green-800"
                : latestApproval.type === "approve_with_notes"
                ? "bg-blue-100 text-blue-800"
                : "bg-orange-100 text-orange-800"
            }
          >
            {latestApproval.type === "approve"
              ? "Approved"
              : latestApproval.type === "approve_with_notes"
              ? "Approved w/ Notes"
              : "Changes Requested"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Creative */}
          <Card>
            <CardContent className="p-4">
              {post.creative_url ? (
                <img src={post.creative_url} alt="" className="w-full rounded-lg object-contain max-h-[500px]" />
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Caption & Hashtags */}
          <Card>
            <CardHeader><CardTitle className="text-base">Caption</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption || "No caption yet"}</p>
              {post.hashtags && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {post.hashtags}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Version History</CardTitle>
              {isSSRole && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadNewVersion(file);
                    }}
                    disabled={uploadingVersion}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadingVersion ? "Uploading..." : "New Version"}
                    </span>
                  </Button>
                </label>
              )}
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions yet</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v: any) => (
                    <div key={v.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => setLightboxVersion(v)}>
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {v.creative_url ? (
                          <img src={v.creative_url} alt="" className="h-12 w-12 object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.users?.name || "Team"} · {new Date(v.created_at).toLocaleDateString()}
                        </p>
                        {v.caption && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.caption}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              )}
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {(c.users?.name || c.users?.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.users?.name || c.users?.email}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{c.body}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[60px]"
                />
                <Button
                  onClick={() => addComment.mutate()}
                  disabled={!commentText.trim() || addComment.isPending}
                  size="sm"
                  className="self-end"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {post.scheduled_at
                    ? new Date(post.scheduled_at).toLocaleDateString()
                    : "Not scheduled"}
                </span>
              </div>
              {(post as any).due_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {new Date((post as any).due_at).toLocaleDateString()}</span>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Badge variant="secondary" className="mt-1">{post.status_column.replace(/_/g, " ")}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Platform</Label>
                <p className="mt-1">{post.platform || "—"}</p>
              </div>
              {isSSRole && (post as any).assigned_to_user_id && (
                <div>
                  <Label className="text-muted-foreground text-xs">Assigned to</Label>
                  <p className="mt-1">{(post as any).assigned_to_user_id}</p>
                </div>
              )}
              {isSSRole && (post as any).reviewer_user_id && (
                <div>
                  <Label className="text-muted-foreground text-xs">Reviewer</Label>
                  <p className="mt-1">{(post as any).reviewer_user_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Panel */}
          {canApprove && isApprovalStatus && (
            <Card className="border-primary">
              <CardHeader><CardTitle className="text-base">Approval</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setApprovalDialog("approve")}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setApprovalDialog("approve_with_notes")}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Approve with Notes
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setApprovalDialog("request_changes")}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval History */}
          {approvals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {approvals.map((a: any) => (
                  <div key={a.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          a.type === "approve"
                            ? "border-green-500 text-green-700"
                            : a.type === "approve_with_notes"
                            ? "border-blue-500 text-blue-700"
                            : "border-orange-500 text-orange-700"
                        }
                      >
                        {a.type === "approve" ? "Approved" : a.type === "approve_with_notes" ? "Approved w/ Notes" : "Changes Requested"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.users?.name || a.users?.email} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.note && <p className="text-xs mt-1 text-foreground">{a.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes (SS only) */}
          {isSSRole && (
            <Card className="border-dashed">
              <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={internalNotes ?? (post as any).internal_notes ?? ""}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Team-only notes..."
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveNotes.mutate()}
                  disabled={saveNotes.isPending}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Version Lightbox Dialog */}
      <Dialog open={!!lightboxVersion} onOpenChange={() => setLightboxVersion(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Version {lightboxVersion?.version_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {lightboxVersion?.creative_url ? (
              /\.(mp4|webm|mov)$/i.test(lightboxVersion.creative_url) ? (
                <video src={lightboxVersion.creative_url} controls className="w-full rounded-lg max-h-[70vh]" />
              ) : (
                <img src={lightboxVersion.creative_url} alt="" className="w-full rounded-lg object-contain max-h-[70vh]" />
              )
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Uploaded by {lightboxVersion?.users?.name || "Team"} · {lightboxVersion && new Date(lightboxVersion.created_at).toLocaleString()}
              </p>
              {lightboxVersion?.caption && <p className="text-foreground">{lightboxVersion.caption}</p>}
              {lightboxVersion?.hashtags && <p className="text-muted-foreground">#{lightboxVersion.hashtags}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog === "approve"
                ? "Approve Post"
                : approvalDialog === "approve_with_notes"
                ? "Approve with Notes"
                : "Request Changes"}
            </DialogTitle>
          </DialogHeader>
          {approvalDialog !== "approve" && (
            <div className="space-y-2">
              <Label>{approvalDialog === "request_changes" ? "What changes are needed?" : "Notes"}</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={
                  approvalDialog === "request_changes"
                    ? "Describe the changes you'd like..."
                    : "Add your notes..."
                }
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApprovalDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitApproval.mutate()}
              disabled={
                submitApproval.isPending ||
                (approvalDialog !== "approve" && !approvalNote.trim())
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
