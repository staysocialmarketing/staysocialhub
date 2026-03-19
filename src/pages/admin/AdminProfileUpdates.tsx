import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Check, X, MessageSquare } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  changes_requested: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminProfileUpdates() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["admin-profile-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_update_requests")
        .select("*, users!profile_update_requests_submitted_by_user_id_fkey(name, email), clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const actionUpdate = useMutation({
    mutationFn: async ({ id, status, clientId, proposedJson }: { id: string; status: string; clientId: string; proposedJson?: any }) => {
      const updateData: any = {
        status,
        reviewed_by_user_id: profile?.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote[id] || null,
      };
      const { error } = await supabase.from("profile_update_requests").update(updateData).eq("id", id);
      if (error) throw error;

      if (status === "approved" && proposedJson) {
        const { error: profileError } = await supabase.from("client_profile").update({
          business_info_json: proposedJson.business_info_json,
          brand_voice_json: proposedJson.brand_voice_json,
          offers_json: proposedJson.offers_json,
          content_prefs_json: proposedJson.content_prefs_json,
          assets_json: proposedJson.assets_json,
          updated_at: new Date().toISOString(),
        }).eq("client_id", clientId);
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile-updates"] });
      toast.success("Profile update actioned");
    },
    onError: () => toast.error("Failed to action update"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profile Update Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve client profile changes.</p>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : updates.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-soft py-12 text-center text-muted-foreground">No profile update requests</div>
      ) : (
        <div className="rounded-2xl bg-card shadow-soft divide-y divide-border/30">
          {updates.map((u: any) => (
            <div key={u.id} className="px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{u.clients?.name || "Unknown Client"}</h4>
                  <p className="text-xs text-muted-foreground">
                    Submitted by {u.users?.name || u.users?.email} on {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className={`rounded-full ${statusColors[u.status]}`}>{u.status.replace("_", " ")}</Badge>
              </div>
              {u.status === "pending" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Review note (optional)"
                    value={reviewNote[u.id] || ""}
                    onChange={(e) => setReviewNote({ ...reviewNote, [u.id]: e.target.value })}
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-lg" onClick={() => actionUpdate.mutate({ id: u.id, status: "approved", clientId: u.client_id, proposedJson: u.proposed_profile_json })}>
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => actionUpdate.mutate({ id: u.id, status: "changes_requested", clientId: u.client_id })}>
                      <MessageSquare className="h-3 w-3 mr-1" />Request Changes
                    </Button>
                    <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => actionUpdate.mutate({ id: u.id, status: "rejected", clientId: u.client_id })}>
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}