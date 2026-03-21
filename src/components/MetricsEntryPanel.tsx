import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BarChart3, Save, Loader2 } from "lucide-react";

interface Props {
  postId: string;
  clientId: string;
}

export default function MetricsEntryPanel({ postId, clientId }: Props) {
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["post-metrics", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_metrics")
        .select("*")
        .eq("post_id", postId)
        .order("reported_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const [impressions, setImpressions] = useState("");
  const [reach, setReach] = useState("");
  const [engagement, setEngagement] = useState("");
  const [clicks, setClicks] = useState("");

  // Pre-fill when existing loads
  const prefilled = existing ? true : false;
  if (existing && !impressions && !reach && !engagement && !clicks) {
    // Only set once
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        post_id: postId,
        client_id: clientId,
        impressions: parseInt(impressions) || 0,
        reach: parseInt(reach) || 0,
        engagement: parseInt(engagement) || 0,
        clicks: parseInt(clicks) || 0,
        reported_at: new Date().toISOString().split("T")[0],
      };

      if (existing) {
        const { error } = await supabase
          .from("content_metrics")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_metrics")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-metrics", postId] });
      queryClient.invalidateQueries({ queryKey: ["content-metrics", clientId] });
      toast.success("Metrics saved");
    },
    onError: () => toast.error("Failed to save metrics"),
  });

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5" /> Performance Metrics
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Impressions</Label>
          <Input
            type="number"
            value={impressions || (existing?.impressions?.toString() ?? "")}
            onChange={(e) => setImpressions(e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Reach</Label>
          <Input
            type="number"
            value={reach || (existing?.reach?.toString() ?? "")}
            onChange={(e) => setReach(e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Engagement</Label>
          <Input
            type="number"
            value={engagement || (existing?.engagement?.toString() ?? "")}
            onChange={(e) => setEngagement(e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Clicks</Label>
          <Input
            type="number"
            value={clicks || (existing?.clicks?.toString() ?? "")}
            onChange={(e) => setClicks(e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
        {existing ? "Update Metrics" : "Save Metrics"}
      </Button>
    </div>
  );
}
