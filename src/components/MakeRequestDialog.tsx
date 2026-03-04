import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type RequestType = Database["public"]["Enums"]["request_type"];

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
  const { profile } = useAuth();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<RequestType>("social_post");
  const [topic, setTopic] = useState(prefillTopic);
  const [notes, setNotes] = useState(prefillNotes);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load clients when dialog opens
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
      loadClients();
    }
    onOpenChange(o);
  };

  const handleSubmit = async () => {
    if (!clientId || !topic.trim() || !profile) return;
    setSubmitting(true);
    try {
      // Create the request
      const { error: reqErr } = await supabase.from("requests").insert({
        client_id: clientId,
        type,
        topic: topic.trim(),
        notes: notes.trim() || null,
        created_by_user_id: profile.id,
      });
      if (reqErr) throw reqErr;

      // Also create a post in idea status
      const { error: postErr } = await supabase.from("posts").insert({
        client_id: clientId,
        title: topic.trim(),
        caption: notes.trim() || null,
        status_column: "idea",
        created_by_user_id: profile.id,
      } as any);
      if (postErr) throw postErr;

      toast.success("Request created and added to workflow!");
      onOpenChange(false);
      setClientId("");
      setTopic("");
      setNotes("");
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
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="social_post">Social Post</SelectItem>
                <SelectItem value="email_campaign">Email Campaign</SelectItem>
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
          <Button className="w-full" onClick={handleSubmit} disabled={!clientId || !topic.trim() || submitting}>
            {submitting ? "Creating..." : "Create Request & Add to Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
