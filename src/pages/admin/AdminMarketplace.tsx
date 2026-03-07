import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Store, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  price: string | null;
  sort_order: number;
  is_active: boolean;
  billing_type: string;
  created_at: string;
}

interface AddonRow {
  id: string;
  addon_name: string;
  status: string;
  created_at: string;
  client_name: string;
  user_name: string;
}

const statusOptions = ["new", "contacted", "closed"];
const statusVariant = (s: string) => s === "new" ? "default" : s === "contacted" ? "secondary" : "outline" as const;

const billingLabels: Record<string, string> = {
  monthly: "Monthly",
  one_time: "One-Time",
  custom: "Custom",
};

export default function AdminMarketplace() {
  const { isSSAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [requests, setRequests] = useState<AddonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<MarketplaceItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("upgrade");
  const [formIcon, setFormIcon] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formBillingType, setFormBillingType] = useState("monthly");

  const fetchItems = async () => {
    const { data } = await supabase.from("marketplace_items").select("*").order("sort_order").order("created_at", { ascending: false });
    setItems((data as MarketplaceItem[]) || []);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("addon_requests")
      .select("id, addon_name, status, created_at, client_id, user_id")
      .order("created_at", { ascending: false });
    if (error || !data) return;

    const clientIds = [...new Set(data.map((r: any) => r.client_id))];
    const userIds = [...new Set(data.map((r: any) => r.user_id))];

    const [{ data: clients }, { data: users }] = await Promise.all([
      supabase.from("clients").select("id, name").in("id", clientIds),
      supabase.from("users").select("id, name, email").in("id", userIds),
    ]);

    const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.name || u.email]));

    setRequests(data.map((r: any) => ({
      id: r.id,
      addon_name: r.addon_name,
      status: r.status,
      created_at: r.created_at,
      client_name: clientMap[r.client_id] || "Unknown",
      user_name: userMap[r.user_id] || "Unknown",
    })));
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchRequests()]).then(() => setLoading(false));
  }, []);

  const openCreate = (category: string) => {
    setEditItem(null);
    setFormName("");
    setFormDescription("");
    setFormCategory(category);
    setFormIcon("");
    setFormPrice("");
    setFormSortOrder(0);
    setFormIsActive(true);
    setFormBillingType("monthly");
    setDialogOpen(true);
  };

  const openEdit = (item: MarketplaceItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormCategory(item.category);
    setFormIcon(item.icon || "");
    setFormPrice(item.price || "");
    setFormSortOrder(item.sort_order);
    setFormIsActive(item.is_active);
    setFormBillingType(item.billing_type || "monthly");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      category: formCategory,
      icon: formIcon.trim() || null,
      price: formPrice.trim() || null,
      sort_order: formSortOrder,
      is_active: formIsActive,
      billing_type: formBillingType,
    };
    if (editItem) {
      const { error } = await supabase.from("marketplace_items").update(payload).eq("id", editItem.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("marketplace_items").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Created" });
    }
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!editItem) return;
    const { error } = await supabase.from("marketplace_items").delete().eq("id", editItem.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    setDialogOpen(false);
    fetchItems();
  };

  const updateRequestStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("addon_requests").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } else {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  };

  const convertToUpgrade = async (req: AddonRow) => {
    const { error } = await supabase.from("marketplace_items").insert({
      name: req.addon_name,
      category: "upgrade",
      description: `Converted from client request by ${req.client_name}`,
      billing_type: "monthly",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Converted to upgrade!" });
    fetchItems();
  };

  const plans = items.filter((i) => i.category === "solution");
  const upgrades = items.filter((i) => i.category === "upgrade");

  const renderItemsGrid = (list: MarketplaceItem[], category: string) => (
    <div className="space-y-4">
      {isSSAdmin && (
        <Button size="sm" onClick={() => openCreate(category)}>
          <Plus className="h-4 w-4 mr-1" /> Add {category === "solution" ? "Plan" : "Upgrade"}
        </Button>
      )}
      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">No {category === "solution" ? "plans" : "upgrades"} yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => (
            <Card key={item.id} className={`transition-shadow hover:shadow-md ${!item.is_active ? "opacity-50" : ""}`}>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{item.icon || "📦"}</span>
                  <div className="flex items-center gap-1">
                    {!item.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    {isSSAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <h4 className="font-semibold text-foreground">{item.name}</h4>
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2">
                  {item.price && <p className="text-sm font-medium text-primary">{item.price}</p>}
                  <Badge variant="secondary" className="text-[10px]">{billingLabels[item.billing_type] || item.billing_type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Marketplace</h2>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
          <TabsTrigger value="requests">Client Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">Done-for-you plans and services available to clients.</p>
          {renderItemsGrid(plans, "solution")}
        </TabsContent>

        <TabsContent value="upgrades" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">Upsell highlights of higher-tier plans within existing solutions.</p>
          {renderItemsGrid(upgrades, "upgrade")}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No client requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {isSSAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.addon_name}</TableCell>
                    <TableCell>{r.user_name}</TableCell>
                    <TableCell>{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {isSSAdmin ? (
                        <Select value={r.status} onValueChange={(v) => updateRequestStatus(r.id, v)}>
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
                      ) : (
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      )}
                    </TableCell>
                    {isSSAdmin && (
                      <TableCell>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => convertToUpgrade(r)}>
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Convert to Upgrade
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : `New ${formCategory === "solution" ? "Plan" : "Upgrade"}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Service name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Icon (emoji)</Label>
                <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="📧" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Price</Label>
                <Input value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="$299/mo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solution">Plan</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Billing Type</Label>
                <Select value={formBillingType} onValueChange={setFormBillingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Sort Order</Label>
                <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Label className="text-xs text-muted-foreground">Active</Label>
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {editItem && isSSAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove this marketplace item.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              {isSSAdmin && <Button onClick={handleSave} disabled={!formName.trim()}>Save</Button>}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
