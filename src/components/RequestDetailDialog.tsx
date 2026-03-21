import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Send, Pencil, Save, X, Loader2, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { compressImage } from "@/lib/imageUtils";
import AIFieldsPanel from "@/components/AIFieldsPanel";
import StrategyEditPanel from "@/components/StrategyEditPanel";
import { REQUEST_TYPE_OPTIONS } from "@/lib/workflowUtils";

type RequestStatus = Database["public"]["Enums"]["request_status"];
type RequestType = Database["public"]["Enums"]["request_type"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.pptx,.txt";

interface RequestDetailDialogProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function RequestDetailDialog({ request, open, onOpenChange }: RequestDetailDialogProps) {
  const { profile, isSSRole, isSSAdmin } = useAuth();
  const isSSUser = isSSRole;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    topic: "",
    notes: "",
    priority: "normal",
    preferred_publish_window: "",
    status: "open" as RequestStatus,
    type: "social_post" as RequestType,
    assigned_to_user_id: "" as string,
  });

  // Fetch SS users for assignment
  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users-for-assign"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
      if (!roles?.length) return [];
      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", userIds);
      return users || [];
    },
    enabled: isSSRole && open,
  });

  useEffect(() => {
    if (request) {
      setForm({
        topic: request.topic || "",
        notes: request.notes || "",
        priority: request.priority || "normal",
        preferred_publish_window: request.preferred_publish_window || "",
        status: request.status,
        type: request.type,
        assigned_to_user_id: request.assigned_to_user_id || "",
      });
      setEditing(false);
    }
  }, [request]);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["request-comments", request?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users!comments_user_id_fkey(name, email)")
        .eq("request_id", request.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!request?.id && open,
  });

  const updateRequest = useMutation({
    mutationFn: async () => {
      const updateData: any = {
        topic: form.topic,
        notes: form.notes || null,
        priority: form.priority,
        preferred_publish_window: form.preferred_publish_window || null,
      };
      if (isSSRole) {
        updateData.status = form.status;
        updateData.type = form.type;
      }
      if (isSSAdmin) {
        updateData.assigned_to_user_id = form.assigned_to_user_id || null;
      }
      const { error } = await supabase.from("requests").update(updateData).eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request updated");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update request"),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comments").insert({
        request_id: request.id,
        user_id: profile!.id,
        body: commentBody,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-comments", request.id] });
      setCommentBody("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const handleDownloadAttachment = async () => {
    if (!request?.attachments_url) return;
    const { data } = await supabase.storage.from("request-attachments").createSignedUrl(request.attachments_url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large — maximum 10MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop();
      const path = `${request.client_id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("request-attachments").upload(path, compressed);
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("requests").update({ attachments_url: path }).eq("id", request.id);
      if (updateError) throw updateError;
      request.attachments_url = path;
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Attachment uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!request) return null;

  const canEdit = isSSRole || request.created_by_user_id === profile?.id;
  const assignedUserName = ssUsers.find((u: any) => u.id === request.assigned_to_user_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{request.topic}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[11px]">{REQUEST_TYPE_OPTIONS.find((o) => o.value === request.type)?.label || request.type.replace("_", " ")}</Badge>
            {request.clients?.name && <Badge variant="outline">{request.clients.name}</Badge>}
            <Badge className={statusColors[request.status] || ""}>{request.status.replace("_", " ")}</Badge>
            <Badge variant="outline" className="capitalize">{request.priority}</Badge>
            {assignedUserName && (
              <Badge variant="secondary" className="text-xs">Assigned: {(assignedUserName as any).name || (assignedUserName as any).email}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}

          {editing ? (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div>
                <Label>Topic</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              </div>

              {isSSRole && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as RequestType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REQUEST_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RequestStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {isSSAdmin && (
                <div>
                  <Label>Assign To</Label>
                  <Select value={form.assigned_to_user_id || "__none__"} onValueChange={(v) => setForm({ ...form, assigned_to_user_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {ssUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Publish Window</Label>
                  <Input value={form.preferred_publish_window} onChange={(e) => setForm({ ...form, preferred_publish_window: e.target.value })} placeholder="e.g. Next week" />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
              </div>

              <div>
                <Label>{request.attachments_url ? "Replace Attachment" : "Add Attachment"} (max 10MB)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleUploadAttachment} disabled={uploading} />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">PDF, images, docs, spreadsheets, presentations</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => updateRequest.mutate()} disabled={!form.topic || updateRequest.isPending}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] sm:min-h-0" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{request.type.replace("_", " ")}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{request.priority}</span></div>
                <div><span className="text-muted-foreground">Created by:</span> {request.users?.name || request.users?.email || "Unknown"}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(request.created_at).toLocaleDateString()}</div>
                {request.preferred_publish_window && (
                  <div className="col-span-2"><span className="text-muted-foreground">Publish Window:</span> {request.preferred_publish_window}</div>
                )}
                {assignedUserName && (
                  <div className="col-span-2"><span className="text-muted-foreground">Assigned to:</span> {(assignedUserName as any).name || (assignedUserName as any).email}</div>
                )}
              </div>

              {request.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/30 rounded-md p-3">{request.notes}</p>
                </div>
              )}

              {request.attachments_url && (
                <Button variant="outline" size="sm" onClick={handleDownloadAttachment}>
                  <Download className="h-3 w-3 mr-1" /> Download Attachment
                </Button>
              )}
            </div>
          )}

          {/* AI & Strategy sections for SS roles */}
          {isSSUser && request && (
            <div className="space-y-2">
              <AIFieldsPanel fields={request} />
              <StrategyEditPanel requestId={request.id} brief={request.strategy_brief} />
            </div>
          )}

          {/* Linked Task */}
          {request?.task_id && (
            <div className="text-xs text-muted-foreground">
              Linked Task ID: <span className="font-mono">{request.task_id}</span>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-medium text-sm mb-3">Comments</h4>
            {commentsLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">No comments yet.</p>
            ) : (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-muted/40 rounded-md p-2 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{c.users?.name || c.users?.email}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p>{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commentBody.trim() && addComment.mutate()}
                className="text-sm"
              />
              <Button size="sm" onClick={() => addComment.mutate()} disabled={!commentBody.trim() || addComment.isPending}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
