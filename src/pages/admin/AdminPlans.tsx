import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  includes_json: string[] | null;
  created_at: string;
}

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [formName, setFormName] = useState("");
  const [formFeatures, setFormFeatures] = useState("");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, includes_json, created_at")
        .order("name");
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const openCreate = () => {
    setEditPlan(null);
    setFormName("");
    setFormFeatures("");
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setFormName(plan.name);
    setFormFeatures((plan.includes_json || []).join(", "));
    setDialogOpen(true);
  };

  const featuresToJson = (raw: string): string[] =>
    raw.split(",").map((s) => s.trim()).filter(Boolean);

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        includes_json: featuresToJson(formFeatures) as any,
      };
      if (editPlan) {
        const { error } = await supabase.from("plans").update(payload).eq("id", editPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(editPlan ? "Plan updated" : "Plan created");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save plan"),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete plan"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Plans</h1>
            <p className="text-sm text-muted-foreground">Manage client subscription plans.</p>
          </div>
        </div>
        {isSSAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />Add Plan
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No plans yet. Create one to get started.</p>
      ) : (
        <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Features</TableHead>
                {isSSAdmin && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {(plan.includes_json || []).join(", ") || "—"}
                  </TableCell>
                  {isSSAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-float">
          <DialogHeader>
            <DialogTitle>{editPlan ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Plan Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Starter, Growth, Pro"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Features <span className="text-muted-foreground/60">(comma-separated)</span>
              </Label>
              <Textarea
                value={formFeatures}
                onChange={(e) => setFormFeatures(e.target.value)}
                placeholder="e.g. 8 posts/month, Monthly strategy call, Dedicated manager"
                className="rounded-xl resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {editPlan && isSSAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the plan. Clients currently assigned this plan will have no plan set.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deletePlan.mutate(editPlan.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              {isSSAdmin && (
                <Button
                  onClick={() => savePlan.mutate()}
                  disabled={!formName.trim() || savePlan.isPending}
                >
                  {savePlan.isPending ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
