import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

interface AddonRow {
  id: string;
  addon_name: string;
  status: string;
  created_at: string;
  client_name: string;
  user_name: string;
}

const statusOptions = ["new", "contacted", "closed"];

const statusVariant = (s: string) => {
  if (s === "new") return "default";
  if (s === "contacted") return "secondary";
  return "outline";
};

export default function AdminAddonRequests() {
  const [rows, setRows] = useState<AddonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("addon_requests")
      .select("id, addon_name, status, created_at, client_id, user_id")
      .order("created_at", { ascending: false });

    if (error || !data) { setLoading(false); return; }

    const clientIds = [...new Set(data.map((r) => r.client_id))];
    const userIds = [...new Set(data.map((r) => r.user_id))];

    const [{ data: clients }, { data: users }] = await Promise.all([
      supabase.from("clients").select("id, name").in("id", clientIds),
      supabase.from("users").select("id, name, email").in("id", userIds),
    ]);

    const clientMap = Object.fromEntries((clients || []).map((c) => [c.id, c.name]));
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u.name || u.email]));

    setRows(data.map((r) => ({
      id: r.id,
      addon_name: r.addon_name,
      status: r.status,
      created_at: r.created_at,
      client_name: clientMap[r.client_id] || "Unknown",
      user_name: userMap[r.user_id] || "Unknown",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("addon_requests").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Add-On Requests</h2>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No add-on requests yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Add-On</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.client_name}</TableCell>
                <TableCell>{r.addon_name}</TableCell>
                <TableCell>{r.user_name}</TableCell>
                <TableCell>{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
