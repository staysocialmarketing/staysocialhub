import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HealthStatus = "active" | "needs_attention" | "inactive";

const healthConfig: Record<HealthStatus, { color: string; label: string; description: string }> = {
  active: {
    color: "bg-green-500",
    label: "Active",
    description: "Client has recent activity.",
  },
  needs_attention: {
    color: "bg-yellow-500",
    label: "Needs Attention",
    description: "Client has not interacted recently.",
  },
  inactive: {
    color: "bg-red-500",
    label: "Inactive",
    description: "No activity detected for an extended period.",
  },
};

interface ClientHealthIndicatorProps {
  clientId: string;
  override?: string | null;
  /** Pre-computed status from a bulk query — skips the per-client query when provided. */
  precomputed?: HealthStatus;
  className?: string;
}

export function ClientHealthIndicator({ clientId, override, precomputed, className }: ClientHealthIndicatorProps) {
  const { data: computedStatus } = useQuery({
    queryKey: ["client-health", clientId],
    // Skip the per-client query when the parent has already computed status in bulk
    enabled: !override && !precomputed,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HealthStatus> => {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [requests14, tasks14, approvals14, requests30, tasks30, approvals30] = await Promise.all([
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", fourteenDaysAgo),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("updated_at", fourteenDaysAgo),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", fourteenDaysAgo),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", thirtyDaysAgo),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("updated_at", thirtyDaysAgo),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", thirtyDaysAgo),
      ]);

      const recent14 = (requests14.count || 0) + (tasks14.count || 0) + (approvals14.count || 0);
      const recent30 = (requests30.count || 0) + (tasks30.count || 0) + (approvals30.count || 0);

      if (recent14 > 0) return "active";
      if (recent30 > 0) return "needs_attention";
      return "inactive";
    },
  });

  const status: HealthStatus = (override as HealthStatus) || precomputed || computedStatus || "active";
  const config = healthConfig[status];
  const isManual = !!override;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("relative inline-flex items-center", className)}>
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", config.color)} />
            {isManual && (
              <span className="absolute -top-1 -right-1.5 text-[7px] font-bold text-muted-foreground leading-none">M</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{config.label}</p>
          <p className="text-muted-foreground">{config.description}</p>
          {isManual && <p className="text-muted-foreground italic mt-0.5">Manually set</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
