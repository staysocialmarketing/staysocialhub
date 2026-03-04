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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, Sparkles } from "lucide-react";

const ALL_ADDONS = [
  "Email Marketing",
  "Reels & Short-Form Video",
  "Paid Social Ads",
  "Blog & SEO Content",
  "Photography Sessions",
  "Community Management",
];

export default function AdminClients() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [whatsNewClient, setWhatsNewClient] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*, plans(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {clients.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">Plan: {c.plans?.name || "None"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
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
