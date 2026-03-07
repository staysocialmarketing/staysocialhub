import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, Sparkles, FolderOpen, ListTodo, Lightbulb } from "lucide-react";


export default function AdminClients() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();
  const [whatsNewClient, setWhatsNewClient] = useState<string | null>(null);
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
  const [whatsNewClient, setWhatsNewClient] = useState<string | null>(null);

  // Edit client state
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editPlanId, setEditPlanId] = useState("");
  const [editAssistants, setEditAssistants] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*, plans(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("id, name").order("name");
      return data || [];
    },
  });

  // Fetch marketplace items for the What's New toggle
  useEffect(() => {
    supabase.from("marketplace_items").select("id, name, category, is_active").eq("is_active", true).order("sort_order").then(({ data }) => {
      setMarketplaceItems(data || []);
    });
  }, []);

  // Linked data for the edit dialog
  const { data: linkedData } = useQuery({
    queryKey: ["client-linked-data", editClient?.id],
    enabled: !!editClient,
    queryFn: async () => {
      const cid = editClient.id;
      const [projects, tasks, thinkTank] = await Promise.all([
        supabase.from("projects").select("id, name, status").eq("client_id", cid).order("created_at", { ascending: false }).limit(10),
        supabase.from("tasks").select("id, title, status").eq("client_id", cid).order("created_at", { ascending: false }).limit(10),
        supabase.from("think_tank_items").select("id, title, status").eq("client_id", cid).order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        projects: projects.data || [],
        tasks: tasks.data || [],
        thinkTank: thinkTank.data || [],
      };
    },
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Client created");
      setOpen(false);
      setName("");
    },
    onError: () => toast.error("Failed to create client"),
  });

  const updateClient = useMutation({
    mutationFn: async () => {
      if (!editClient) return;
      const { error } = await supabase.from("clients").update({
        name: editName.trim(),
        status: editStatus,
        plan_id: editPlanId || null,
        assistants_can_approve: editAssistants,
      }).eq("id", editClient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Client updated");
      setEditClient(null);
    },
    onError: () => toast.error("Failed to update client"),
  });

  const toggleAssistants = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("clients").update({ assistants_can_approve: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("Updated");
    },
  });

  const updateWhatsNew = useMutation({
    mutationFn: async ({ id, addons }: { id: string; addons: string[] }) => {
      const { error } = await supabase.from("clients").update({ whats_new_visible_addons: addons as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast.success("What's New updated");
    },
  });

  const whatsNewClientData = clients.find((c: any) => c.id === whatsNewClient);
  const currentAddons: string[] = whatsNewClientData ? ((whatsNewClientData as any).whats_new_visible_addons || []) : [];

  const toggleAddon = (addon: string) => {
    if (!whatsNewClient) return;
    const updated = currentAddons.includes(addon)
      ? currentAddons.filter((a) => a !== addon)
      : [...currentAddons, addon];
    updateWhatsNew.mutate({ id: whatsNewClient, addons: updated });
  };

  const openEditClient = (client: any) => {
    setEditClient(client);
    setEditName(client.name);
    setEditStatus(client.status);
    setEditPlanId(client.plan_id || "");
    setEditAssistants(client.assistants_can_approve);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Clients</h2>
        {isSSAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Client Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" /></div>
                <Button className="w-full" onClick={() => createClient.mutate()} disabled={!name}>Create Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* What's New toggle dialog */}
      <Dialog open={!!whatsNewClient} onOpenChange={(o) => !o && setWhatsNewClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What's New — {whatsNewClientData?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select which add-ons appear in this client's dashboard "What's New" section.</p>
          <div className="space-y-3 mt-2">
            {ALL_ADDONS.map((addon) => (
              <label key={addon} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={currentAddons.includes(addon)}
                  onCheckedChange={() => toggleAddon(addon)}
                />
                <span className="text-sm">{addon}</span>
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Client — {editClient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Plan</Label>
              <Select value={editPlanId || "__none__"} onValueChange={(v) => setEditPlanId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No plan</SelectItem>
                  {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground">Assistants can approve</Label>
              <Switch checked={editAssistants} onCheckedChange={setEditAssistants} />
            </div>

            {/* Linked data */}
            {linkedData && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Activity</p>
                
                {linkedData.projects.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium flex items-center gap-1"><FolderOpen className="h-3 w-3" /> Projects ({linkedData.projects.length})</p>
                    {linkedData.projects.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-xs pl-4">
                        <span>{p.name}</span>
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {linkedData.tasks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium flex items-center gap-1"><ListTodo className="h-3 w-3" /> Tasks ({linkedData.tasks.length})</p>
                    {linkedData.tasks.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs pl-4">
                        <span>{t.title}</span>
                        <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {linkedData.thinkTank.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Think Tank ({linkedData.thinkTank.length})</p>
                    {linkedData.thinkTank.map((i: any) => (
                      <div key={i.id} className="flex items-center justify-between text-xs pl-4">
                        <span>{i.title}</span>
                        <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {linkedData.projects.length === 0 && linkedData.tasks.length === 0 && linkedData.thinkTank.length === 0 && (
                  <p className="text-xs text-muted-foreground">No linked projects, tasks, or ideas yet.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={() => updateClient.mutate()} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {clients.map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => isSSAdmin && openEditClient(c)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">Plan: {c.plans?.name || "None"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  {isSSAdmin && (
                    <>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setWhatsNewClient(c.id)}>
                        <Sparkles className="h-3.5 w-3.5" />What's New
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Assistants approve</Label>
                        <Switch
                          checked={c.assistants_can_approve}
                          onCheckedChange={(v) => toggleAssistants.mutate({ id: c.id, value: v })}
                        />
                      </div>
                    </>
                  )}
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
