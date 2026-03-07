import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface ClientSelectWithCreateProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
}

export default function ClientSelectWithCreate({
  value,
  onValueChange,
  placeholder = "Select client",
  allowNone = true,
  noneLabel = "No client",
}: ClientSelectWithCreateProps) {
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").eq("status", "active").order("name");
    setClients(data || []);
    setLoaded(true);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSelectChange = (v: string) => {
    if (v === "__create__") {
      setCreateOpen(true);
      return;
    }
    onValueChange(v === "__none__" ? "" : v);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from("clients").insert({ name: newName.trim() }).select("id").single();
      if (error) throw error;
      toast.success(`Client "${newName.trim()}" created`);
      setNewName("");
      setCreateOpen(false);
      await loadClients();
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      if (data) onValueChange(data.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Select value={value || (allowNone ? "__none__" : "")} onValueChange={handleSelectChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="__none__">{noneLabel}</SelectItem>}
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
          <SelectItem value="__create__" className="text-primary font-medium">
            <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> New Client</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Business name" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
