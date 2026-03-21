import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { Plus, Trash2, Pencil, Zap, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TRIGGER_EVENTS = [
  { value: "request_created", label: "Request Created" },
  { value: "post_status_changed", label: "Post Status Changed" },
  { value: "task_created", label: "Task Created" },
  { value: "task_status_changed", label: "Task Status Changed" },
];

const ACTION_TYPES = [
  { value: "assign_user", label: "Assign to User" },
  { value: "notify_user", label: "Notify User" },
  { value: "change_status", label: "Change Status" },
  { value: "add_tag", label: "Add Tag (Posts only)" },
];

const POST_STATUSES = [
  "idea", "ai_draft", "in_progress", "internal_review", "corey_review",
  "ready_for_client_batch", "client_approval", "changes_requested",
  "ready_to_schedule", "scheduled", "published", "sent",
];

const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "archived"];

interface RuleFormData {
  name: string;
  trigger_event: string;
  conditions_json: Record<string, string>;
  action_type: string;
  action_config_json: Record<string, string>;
}

const emptyForm: RuleFormData = {
  name: "",
  trigger_event: "",
  conditions_json: {},
  action_type: "",
  action_config_json: {},
};

export default function AdminAutomations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormData>(emptyForm);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const payload = {
        name: data.name,
        trigger_event: data.trigger_event,
        conditions_json: data.conditions_json,
        action_type: data.action_type,
        action_config_json: data.action_config_json,
        created_by_user_id: profile!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("automation_rules").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automation_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Rule updated" : "Rule created" });
    },
    onError: (err) => toast({ title: "Error", description: String(err), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const openEdit = (rule: typeof rules[0]) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      trigger_event: rule.trigger_event,
      conditions_json: (rule.conditions_json || {}) as Record<string, string>,
      action_type: rule.action_type,
      action_config_json: (rule.action_config_json || {}) as Record<string, string>,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const triggerLabel = (v: string) => TRIGGER_EVENTS.find((t) => t.value === v)?.label || v;
  const actionLabel = (v: string) => ACTION_TYPES.find((a) => a.value === v)?.label || v;
  const userName = (id: string) => users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email || id;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || id;

  const isStatusTrigger = form.trigger_event.includes("status_changed");
  const isPostTrigger = form.trigger_event.startsWith("post");
  const isTaskTrigger = form.trigger_event.startsWith("task");
  const statusOptions = isPostTrigger ? POST_STATUSES : TASK_STATUSES;

  const updateCondition = (key: string, val: string) => {
    setForm((f) => ({
      ...f,
      conditions_json: val ? { ...f.conditions_json, [key]: val } : Object.fromEntries(Object.entries(f.conditions_json).filter(([k]) => k !== key)),
    }));
  };

  const updateConfig = (key: string, val: string) => {
    setForm((f) => ({
      ...f,
      action_config_json: val ? { ...f.action_config_json, [key]: val } : Object.fromEntries(Object.entries(f.action_config_json).filter(([k]) => k !== key)),
    }));
  };

  const canSave = form.name && form.trigger_event && form.action_type;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Automation Rules" subtitle="Define automatic actions triggered by events in the Hub" />
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No automation rules yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardContent className="py-4 px-5 flex items-center gap-4">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, is_active: v })}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{rule.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{triggerLabel(rule.trigger_event)}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{actionLabel(rule.action_type)}</Badge>
                    {(rule.conditions_json as Record<string, string>)?.client_id && (
                      <Badge variant="secondary" className="text-[10px]">
                        Client: {clientName((rule.conditions_json as Record<string, string>).client_id)}
                      </Badge>
                    )}
                    {(rule.action_config_json as Record<string, string>)?.user_id && (
                      <Badge variant="secondary" className="text-[10px]">
                        → {userName((rule.action_config_json as Record<string, string>).user_id)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(rule.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rule" : "New Automation Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-assign video requests" />
            </div>

            <div>
              <Label>Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm((f) => ({ ...f, trigger_event: v, conditions_json: {} }))}>
                <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.trigger_event && (
              <>
                <div className="border rounded-xl p-3 space-y-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conditions (optional)</p>

                  <div>
                    <Label className="text-xs">Client</Label>
                    <Select value={form.conditions_json.client_id || ""} onValueChange={(v) => updateCondition("client_id", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any client</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isPostTrigger && (
                    <div>
                      <Label className="text-xs">Content Type</Label>
                      <Input className="h-8 text-xs" value={form.conditions_json.content_type || ""} onChange={(e) => updateCondition("content_type", e.target.value)} placeholder="e.g. video, image" />
                    </div>
                  )}

                  {isStatusTrigger && (
                    <>
                      <div>
                        <Label className="text-xs">From Status</Label>
                        <Select value={form.conditions_json.from_status || ""} onValueChange={(v) => updateCondition("from_status", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any</SelectItem>
                            {statusOptions.map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">To Status</Label>
                        <Select value={form.conditions_json.to_status || ""} onValueChange={(v) => updateCondition("to_status", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any</SelectItem>
                            {statusOptions.map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label>Action</Label>
                  <Select value={form.action_type} onValueChange={(v) => setForm((f) => ({ ...f, action_type: v, action_config_json: {} }))}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(form.action_type === "assign_user" || form.action_type === "notify_user") && (
                  <div>
                    <Label className="text-xs">User</Label>
                    <Select value={form.action_config_json.user_id || ""} onValueChange={(v) => updateConfig("user_id", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.action_type === "notify_user" && (
                  <div>
                    <Label className="text-xs">Message</Label>
                    <Input className="h-8 text-xs" value={form.action_config_json.message || ""} onChange={(e) => updateConfig("message", e.target.value)} placeholder="Custom notification message" />
                  </div>
                )}

                {form.action_type === "change_status" && (
                  <div>
                    <Label className="text-xs">New Status</Label>
                    <Select value={form.action_config_json.status || ""} onValueChange={(v) => updateConfig("status", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.action_type === "add_tag" && (
                  <div>
                    <Label className="text-xs">Tag</Label>
                    <Input className="h-8 text-xs" value={form.action_config_json.tag || ""} onChange={(e) => updateConfig("tag", e.target.value)} placeholder="Tag name" />
                  </div>
                )}
              </>
            )}

            <Button className="w-full" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
              {saveMutation.isPending ? "Saving…" : editingId ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
