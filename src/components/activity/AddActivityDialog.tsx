import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "manual_note", label: "Note" },
  { value: "request_created", label: "Request Created" },
  { value: "approval_completed", label: "Approval Completed" },
  { value: "media_uploaded", label: "Media Uploaded" },
  { value: "campaign_launched", label: "Campaign Launched" },
  { value: "post_published", label: "Post Published" },
  { value: "email_sent", label: "Email Sent" },
];

interface Props {
  clientId: string;
}

export function AddActivityDialog({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("manual_note");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_activity").insert({
        client_id: clientId,
        title,
        description: description || null,
        activity_type: activityType,
        visible_to_client: visibleToClient,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-activity", clientId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setActivityType("manual_note");
      setVisibleToClient(true);
      toast.success("Activity added");
    },
    onError: () => toast.error("Failed to add activity"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Plus className="h-3 w-3" /> Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity title..." />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Details..." />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="visible" checked={visibleToClient} onCheckedChange={(v) => setVisibleToClient(!!v)} />
            <Label htmlFor="visible" className="text-sm">Visible to client</Label>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending} className="w-full">
            Add Activity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
