import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FixType = "content" | "design";

interface RequestChangesModalProps {
  postId: string;
  postTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestChangesModal({ postId, postTitle, open, onOpenChange }: RequestChangesModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [fixType, setFixType] = useState<FixType>("content");
  const [note, setNote] = useState("");

  const submitChanges = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");

      const prefix = fixType === "design" ? "[Design Fix]" : "[Content Fix]";
      const body = note.trim() ? `${prefix}\n${note.trim()}` : prefix;

      await supabase.from("comments").insert({ post_id: postId, user_id: profile.id, body });
      await supabase.from("approvals").insert({
        post_id: postId,
        user_id: profile.id,
        type: "request_changes" as any,
        note: body,
      });

      const newStatus = fixType === "design" ? "design" : "corey_review";
      const { error } = await supabase
        .from("posts")
        .update({ status_column: newStatus as any })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      queryClient.invalidateQueries({ queryKey: ["client-approval-posts"] });
      toast.success(
        fixType === "design"
          ? "Design fix requested — returned to Design"
          : "Changes requested — returned to Corey Review"
      );
      setFixType("content");
      setNote("");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to request changes"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select what needs to change for <span className="font-medium text-foreground">"{postTitle}"</span>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={() => setFixType("content")}
            className={cn(
              "rounded-xl border-2 p-3 text-sm text-left transition-colors",
              fixType === "content"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            <div className="font-semibold">Content Fix</div>
            <div className="text-xs opacity-70 mt-0.5">Caption, copy, or other text</div>
          </button>
          <button
            type="button"
            onClick={() => setFixType("design")}
            className={cn(
              "rounded-xl border-2 p-3 text-sm text-left transition-colors",
              fixType === "design"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            <div className="font-semibold">Design Fix</div>
            <div className="text-xs opacity-70 mt-0.5">Image, layout, or visual</div>
          </button>
        </div>
        <Textarea
          placeholder="Add a note (optional)..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="mt-2"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => submitChanges.mutate()}
            disabled={submitChanges.isPending}
          >
            {submitChanges.isPending ? "Submitting..." : "Request Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
