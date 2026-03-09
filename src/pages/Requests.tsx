import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import RequestDetailDialog from "@/components/RequestDetailDialog";
import { compressImage } from "@/lib/imageUtils";
import { REQUEST_TYPE_OPTIONS } from "@/lib/workflowUtils";

type RequestType = Database["public"]["Enums"]["request_type"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.pptx,.txt";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Requests() {
  const { profile, isSSRole, isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [form, setForm] = useState({
    type: "social_post" as RequestType,
    topic: "",
    notes: "",
    preferred_publish_window: "",
    priority: "normal",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
    enabled: isSSAdmin,
  });

  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
      if (!roles?.length) return [];
      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data } = await supabase.from("users").select("id, name, email").in("id", userIds);
      return data || [];
    },
    enabled: isSSRole,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests", profile?.client_id, globalClientId],
    queryFn: async () => {
      let query = supabase.from("requests").select("*, users!requests_created_by_user_id_fkey(name, email), clients(name)").order("created_at", { ascending: false });
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      else if (globalClientId) query = query.eq("client_id", globalClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const filteredRequests = typeFilter === "all" ? requests : requests.filter((r: any) => r.type === typeFilter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File too large — maximum 10MB");
      e.target.value = "";
      return;
    }
    setAttachmentFile(file);
  };

  const createRequest = useMutation({
    mutationFn: async () => {
      const clientId = isSSAdmin ? selectedClientId : profile?.client_id;
      if (!clientId) throw new Error("No client selected");

      let attachments_url: string | null = null;
      if (attachmentFile) {
        const compressed = await compressImage(attachmentFile);
        const ext = compressed.name.split(".").pop();
        const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("request-attachments").upload(path, compressed);
        if (uploadError) {
          toast.warning("Attachment upload failed — request will be created without it");
        } else {
          attachments_url = path;
        }
      }

      const { error } = await supabase.from("requests").insert({
        client_id: clientId,
        type: form.type,
        topic: form.topic,
        notes: form.notes || null,
        preferred_publish_window: form.preferred_publish_window || null,
        priority: form.priority,
        created_by_user_id: profile!.id,
        attachments_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Request submitted!");
      setOpen(false);
      setForm({ type: "social_post", topic: "", notes: "", preferred_publish_window: "", priority: "normal" });
      setAttachmentFile(null);
      setSelectedClientId("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit request"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { error } = await supabase.from("requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const canCreate = !!profile?.client_id || isSSAdmin;

  const getAssignedName = (userId: string | null) => {
    if (!userId) return null;
    const u = ssUsers.find((u: any) => u.id === userId);
    return u ? ((u as any).name || (u as any).email) : null;
  };

  const getTypeLabel = (type: string) => {
    return REQUEST_TYPE_OPTIONS.find((o) => o.value === type)?.label || type.replace("_", " ");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Requests</h2>
          <p className="text-muted-foreground">Submit and track content requests</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Content Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {isSSAdmin && (
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Request Type</Label>
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
                  <Label>Topic / Title</Label>
                  <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="What's this about?" />
                </div>

                <div>
                  <Label>Preferred Publish Window</Label>
                  <Input value={form.preferred_publish_window} onChange={(e) => setForm({ ...form, preferred_publish_window: e.target.value })} placeholder="e.g. Next week, March 15" />
                </div>

                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." /></div>
                <div>
                  <Label>Attachment (max 10MB)</Label>
                  <Input type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground mt-1">PDF, images, docs, spreadsheets, presentations</p>
                </div>

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

                <Button className="w-full" onClick={() => createRequest.mutate()} disabled={!form.topic || createRequest.isPending || (isSSAdmin && !selectedClientId)}>
                  {createRequest.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Filter:</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REQUEST_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading requests...</p>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No requests yet. Create your first request!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req: any) => {
            const assignedName = isSSRole ? getAssignedName(req.assigned_to_user_id) : null;
            return (
              <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequest(req)}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground truncate">{req.topic}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.clients?.name && <span className="font-medium">{req.clients.name} · </span>}
                      By {req.users?.name || req.users?.email || "Unknown"} · {new Date(req.created_at).toLocaleDateString()}
                      {req.attachments_url && " · 📎 Attachment"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="outline" className="text-[11px]">{getTypeLabel(req.type)}</Badge>
                    {assignedName && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <User className="h-3 w-3" /> {assignedName}
                      </Badge>
                    )}
                    {isSSRole ? (
                      <Select value={req.status} onValueChange={(v) => updateStatus.mutate({ id: req.id, status: v as RequestStatus })}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusColors[req.status] || ""}>{req.status.replace("_", " ")}</Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{req.priority}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RequestDetailDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
      />
    </div>
  );
}
