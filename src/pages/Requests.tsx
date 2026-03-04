import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, FileText, Mail } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import RequestDetailDialog from "@/components/RequestDetailDialog";

type RequestType = Database["public"]["Enums"]["request_type"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Requests() {
  const { profile, isSSRole, isSSAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [form, setForm] = useState({
    type: "social_post" as RequestType,
    topic: "",
    notes: "",
    preferred_publish_window: "",
    priority: "normal",
    link: "",
    campaign_type: "newsletter",
    audience: "",
    deadline: "",
  });

  // Fetch clients for SS Admin client selector
  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
    enabled: isSSAdmin,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests", profile?.client_id],
    queryFn: async () => {
      let query = supabase.from("requests").select("*, users!requests_created_by_user_id_fkey(name, email), clients(name)").order("created_at", { ascending: false });
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const clientId = isSSAdmin ? selectedClientId : profile?.client_id;
      if (!clientId) throw new Error("No client selected");

      let attachments_url: string | null = null;
      if (attachmentFile) {
        const ext = attachmentFile.name.split(".").pop();
        const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("request-attachments").upload(path, attachmentFile);
        if (uploadError) throw uploadError;
        attachments_url = path;
      }

      const notes = form.type === "email_campaign"
        ? `Campaign: ${form.campaign_type}\nAudience: ${form.audience}\nDeadline: ${form.deadline}\n\n${form.notes}`
        : form.notes;

      const { error } = await supabase.from("requests").insert({
        client_id: clientId,
        type: form.type,
        topic: form.topic,
        notes: notes || null,
        preferred_publish_window: form.preferred_publish_window || null,
        priority: form.priority,
        created_by_user_id: profile!.id,
        attachments_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request submitted!");
      setOpen(false);
      setForm({ type: "social_post", topic: "", notes: "", preferred_publish_window: "", priority: "normal", link: "", campaign_type: "newsletter", audience: "", deadline: "" });
      setAttachmentFile(null);
      setSelectedClientId("");
    },
    onError: () => toast.error("Failed to submit request"),
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
                {/* SS Admin client selector */}
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
                      <SelectItem value="social_post"><span className="flex items-center gap-2"><FileText className="h-3 w-3" /> Social Post</span></SelectItem>
                      <SelectItem value="email_campaign"><span className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email Campaign</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{form.type === "social_post" ? "Topic / Key Message" : "Campaign Name"}</Label>
                  <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder={form.type === "social_post" ? "What's this about?" : "Campaign name"} />
                </div>

                {form.type === "social_post" && (
                  <>
                    <div><Label>Link (optional)</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." type="url" /></div>
                    <div><Label>Preferred Publish Window</Label><Input value={form.preferred_publish_window} onChange={(e) => setForm({ ...form, preferred_publish_window: e.target.value })} placeholder="e.g. Next week, March 15" /></div>
                  </>
                )}

                {form.type === "email_campaign" && (
                  <>
                    <div>
                      <Label>Campaign Type</Label>
                      <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="promo">Promotion</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="drip">Drip Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Audience</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Who is this for?" /></div>
                    <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                  </>
                )}

                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." /></div>
                <div><Label>Attachment</Label><Input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} /></div>

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

      {isLoading ? (
        <p className="text-muted-foreground">Loading requests...</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No requests yet. Create your first request!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequest(req)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {req.type === "social_post" ? <FileText className="h-4 w-4 text-primary shrink-0" /> : <Mail className="h-4 w-4 text-primary shrink-0" />}
                    <h4 className="font-medium text-foreground truncate">{req.topic}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {req.clients?.name && <span className="font-medium">{req.clients.name} · </span>}
                    By {req.users?.name || req.users?.email || "Unknown"} · {new Date(req.created_at).toLocaleDateString()}
                    {req.attachments_url && " · 📎 Attachment"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          ))}
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
