import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import RequestChangesModal from "@/components/RequestChangesModal";
import { getApproveTarget } from "@/lib/workflowUtils";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

interface ApprovalActionsProps {
  postId: string;
  postTitle: string;
  currentStatus: PostStatus;
  contentType?: string | null;
  /** Legacy prop — ignored if contentType is provided */
  approveTarget?: PostStatus;
  className?: string;
}

export default function ApprovalActions({ postId, postTitle, currentStatus, contentType, approveTarget: legacyTarget, className }: ApprovalActionsProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [changesOpen, setChangesOpen] = useState(false);

  const computedTarget = getApproveTarget(contentType ?? null, currentStatus);
  const target = computedTarget;

  const approve = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");

      await supabase.from("approvals").insert({
        post_id: postId,
        user_id: profile.id,
        type: "approve" as any,
      });

      const { error } = await supabase
        .from("posts")
        .update({ status_column: target } as any)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      queryClient.invalidateQueries({ queryKey: ["client-approval-posts"] });
      toast.success("Approved!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve"),
  });

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1"
          onClick={(e) => { e.stopPropagation(); approve.mutate(); }}
          disabled={approve.isPending}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1"
          onClick={(e) => { e.stopPropagation(); setChangesOpen(true); }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Changes
        </Button>
      </div>
      <RequestChangesModal
        postId={postId}
        postTitle={postTitle}
        open={changesOpen}
        onOpenChange={setChangesOpen}
      />
    </div>
  );
}
