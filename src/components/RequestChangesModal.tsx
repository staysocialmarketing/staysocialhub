import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CHANGE_OPTIONS = [
  { id: "design", label: "Design change" },
  { id: "content", label: "Content / caption change" },
  { id: "other", label: "Other / leave note" },
];

interface RequestChangesModalProps {
  postId: string;
  postTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestChangesModal({ postId, postTitle, open, onOpenChange }: RequestChangesModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const submitChanges = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      if (selected.length === 0) throw new Error("Please select at least one option");

      // Build comment body
      const parts: string[] = ["📝 Changes requested:"];
      selected.forEach(s => {
        const opt = CHANGE_OPTIONS.find(o => o.id === s);
        if (opt) parts.push(`• ${opt.label}`);
      });
      if (note.trim()) parts.push(`\nNote: ${note.trim()}`);
      const body = parts.join("\n");

      // Insert comment
      await supabase.from("comments").insert({
        post_id: postId,
        user_id: profile.id,
        body,
      });

      // Record in approvals table
      await supabase.from("approvals").insert({
        post_id: postId,
        user_id: profile.id,
        type: "request_changes" as any,
        note: body,
      });

      // Return post to corey_review for SS team follow-up
      const { error } = await supabase
        .from("posts")
        .update({ status_column: "corey_review" as any })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      queryClient.invalidateQueries({ queryKey: ["client-approval-posts"] });
      toast.success("Changes requested — returned to Corey Review");
      setSelected([]);
      setNote("");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to request changes"),
  });

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select what needs to change for <span className="font-medium text-foreground">"{postTitle}"</span>
        </p>
        <div className="space-y-3 mt-2">
          {CHANGE_OPTIONS.map(opt => (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} />
              <Label className="cursor-pointer">{opt.label}</Label>
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Add a note (optional unless 'Other' is selected)..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="mt-2"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => submitChanges.mutate()}
            disabled={selected.length === 0 || (selected.includes("other") && !note.trim()) || submitChanges.isPending}
          >
            {submitChanges.isPending ? "Submitting..." : "Request Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
