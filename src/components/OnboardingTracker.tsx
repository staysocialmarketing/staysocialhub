import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_STEPS = [
  "Brand voice defined",
  "Strategy created",
  "Client goals documented",
  "Content pillars identified",
  "First social posts planned",
  "First email campaign planned",
  "Media assets uploaded",
  "Hub training completed",
];

interface OnboardingItem {
  id: string;
  client_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

interface OnboardingTrackerProps {
  clientId: string;
  isAdmin: boolean;
  compact?: boolean;
}

type OnboardingStatus = "not_started" | "in_progress" | "completed";

const statusConfig: Record<OnboardingStatus, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "border-border text-muted-foreground" },
  in_progress: { label: "In Progress", color: "border-primary/30 text-primary bg-primary/5" },
  completed: { label: "Completed", color: "border-border text-foreground bg-muted" },
};

export function OnboardingTracker({ clientId, isAdmin, compact = false }: OnboardingTrackerProps) {
  const queryClient = useQueryClient();
  const [newStep, setNewStep] = useState("");
  const [seeding, setSeeding] = useState(false);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["client-onboarding", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("client_id", clientId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as OnboardingItem[];
    },
  });

  // Seed default steps on first open if empty
  useEffect(() => {
    if (!isLoading && items.length === 0 && !seeding && isAdmin) {
      setSeeding(true);
      const seedSteps = async () => {
        const toInsert = DEFAULT_STEPS.map((title, idx) => ({
          client_id: clientId,
          title,
          sort_order: idx,
          completed: false,
        }));
        const { error } = await supabase.from("client_onboarding").insert(toInsert);
        if (error) {
          console.error("Failed to seed onboarding steps:", error);
        }
        setSeeding(false);
        refetch();
      };
      seedSteps();
    }
  }, [isLoading, items.length, seeding, clientId, isAdmin, refetch]);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const status: OnboardingStatus =
    completedCount === 0 ? "not_started" : completedCount === totalCount ? "completed" : "in_progress";

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("client_onboarding")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-onboarding", clientId] });
    },
    onError: () => toast.error("Failed to update step"),
  });

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : -1;
      const { error } = await supabase.from("client_onboarding").insert({
        client_id: clientId,
        title,
        sort_order: maxOrder + 1,
        completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-onboarding", clientId] });
      setNewStep("");
      toast.success("Step added");
    },
    onError: () => toast.error("Failed to add step"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_onboarding").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-onboarding", clientId] });
      toast.success("Step removed");
    },
    onError: () => toast.error("Failed to remove step"),
  });

  if (isLoading || seeding) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading onboarding...</span>
      </div>
    );
  }

  const config = statusConfig[status];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Status badge + progress */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Badge variant="outline" className={cn("text-xs", config.color)}>
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {completedCount} of {totalCount} steps completed
        </span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Checklist */}
      <div className={cn("space-y-2", compact && "space-y-1.5")}>
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-md transition-colors",
              !compact && "hover:bg-muted/50",
              item.completed && "opacity-70"
            )}
          >
            {isAdmin ? (
              <Checkbox
                checked={item.completed}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: item.id, completed: !!checked })
                }
                disabled={toggleMutation.isPending}
              />
            ) : (
              <span className="shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </span>
            )}
            <span
              className={cn(
                "text-sm flex-1",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.title}
            </span>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add step input (admin only) */}
      {isAdmin && (
        <div className="flex gap-2 pt-2">
          <Input
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            placeholder="Add a step..."
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newStep.trim()) {
                addMutation.mutate(newStep.trim());
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => newStep.trim() && addMutation.mutate(newStep.trim())}
            disabled={!newStep.trim() || addMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
