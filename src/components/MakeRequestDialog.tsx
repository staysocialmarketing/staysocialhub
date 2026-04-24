import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import { compressImage } from "@/lib/imageUtils";
import { REQUEST_TYPE_OPTIONS } from "@/lib/workflowUtils";

type RequestType = Database["public"]["Enums"]["request_type"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.pptx,.txt";

interface MakeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillTopic?: string;
  prefillNotes?: string;
  onSuccess?: () => void;
}

export default function MakeRequestDialog({
  open,
  onOpenChange,
  prefillTopic = "",
  prefillNotes = "",
  onSuccess,
}: MakeRequestDialogProps) {
  const { profile, realProfile, isSSRole, isImpersonating } = useAuth();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<RequestType>("social_post");
  const [topic, setTopic] = useState(prefillTopic);
  const [notes, setNotes] = useState(prefillNotes);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const loadClients = async () => {
    if (loaded) return;
    const { data } = await supabase.from("clients").select("id, name").eq("status", "active").order("name");
    setClients(data || []);
    setLoaded(true);
  };

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setTopic(prefillTopic);
      setNotes(prefillNotes);
      setAttachmentFile(null);
      if (isSSRole) {
        loadClients();
      } else if (profile?.client_id) {
        setClientId(profile.client_id);
      }
    }
    onOpenChange(o);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File too large — maximum 10MB");
      e.target.value = "";
      return;
    }
    setAttachmentFile(file);
  };

  const handleSubmit = async () => {
    if (!clientId || !topic.trim() || !profile) return;
    setSubmitting(true);
    try {
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

      const { error: reqErr } = await supabase.from("posts").insert({
        source: "client_request",
        status_column: "idea",
        title: topic.trim(),
        content_type: type,
        client_id: clientId,
        created_by_user_id: profile.id,
        submitted_on_behalf_by: isImpersonating ? realProfile!.id : null,
        request_notes: notes.trim() || null,
        creative_url: attachments_url,
      } as any);
      if (reqErr) throw reqErr;

      toast.success("Request created and added to workflow!");
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["client-pipeline-posts"] });
      onOpenChange(false);
      setClientId("");
      setTopic("");
      setNotes("");
      setType("social_post");
      setAttachmentFile(null);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make This a Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {isSSRole && (
            <div>
              <Label>Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} allowNone={false} placeholder="Select client" />
            </div>
          )}
          <div>
            <Label>Request Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic / key message" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
          </div>
          <div>
            <Label>Attachment (max 10MB)</Label>
            <Input type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground mt-1">PDF, images, docs, spreadsheets, presentations</p>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!clientId || !topic.trim() || submitting}>
            {submitting ? "Creating..." : "Create Request & Add to Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
