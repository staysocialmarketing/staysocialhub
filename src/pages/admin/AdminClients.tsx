import { useState, useEffect } from "react";
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
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, Sparkles, FolderOpen, ListTodo, Lightbulb, MessageSquarePlus, Target, Image, Activity, ImageIcon, Film, Mic, Download, Link2, ExternalLink, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { AddActivityDialog } from "@/components/activity/AddActivityDialog";
import { ClientHealthIndicator } from "@/components/ClientHealthIndicator";

function isVoiceNote(url: string | null) {
  if (!url) return false;
  return /voice-notes\/.*\.webm$/i.test(url) || /voice-\d+\.webm$/i.test(url);
}
function isVideo(url: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi)$/i.test(url) && !isVoiceNote(url);
}

export default function AdminClients() {
  const queryClient = useQueryClient();
  const { isSSAdmin, isSSTeam } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [whatsNewClient, setWhatsNewClient] = useState<string | null>(null);
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);

  // Edit client state
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editPlanId, setEditPlanId] = useState("");
  const [editAssistants, setEditAssistants] = useState(false);
  const [editHealthOverride, setEditHealthOverride] = useState<string>("__auto__");

  // Media dialog
  const [mediaClientId, setMediaClientId] = useState<string | null>(null);
  const [mediaClientName, setMediaClientName] = useState("");

  // Activity dialog
  const [activityClientId, setActivityClientId] = useState<string | null>(null);
  const [activityClientName, setActivityClientName] = useState("");

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

  useEffect(() => {
    supabase.from("marketplace_items").select("id, name, category, is_active").eq("is_active", true).order("sort_order").then(({ data }) => {
      setMarketplaceItems(data || []);
    });
  }, []);

  // Media query for selected client
  const { data: mediaItems = [], isLoading: mediaLoading } = useQuery({
    queryKey: ["client-media", mediaClientId],
    enabled: !!mediaClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, platform, creative_url, created_at, scheduled_at, status_column")
        .eq("client_id", mediaClientId!)
        .in("status_column", ["published", "approved", "scheduled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Activity query for selected client
  const { data: activityData } = useQuery({
    queryKey: ["client-activity-admin", activityClientId],
    enabled: !!activityClientId,
    queryFn: async () => {
      const cid = activityClientId!;
      const [projects, tasks, thinkTank, requests] = await Promise.all([
        supabase.from("projects").select("id, name, status, description").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
        supabase.from("tasks").select("id, title, status, priority, assigned_to_user_id, project_id").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
        supabase.from("think_tank_items").select("id, title, status, type").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
        supabase.from("requests").select("id, topic, status").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        projects: projects.data || [],
        tasks: tasks.data || [],
        thinkTank: thinkTank.data || [],
        requests: requests.data || [],
      };
    },
  });

  // Timeline activities for selected client
  const [timelineLimit, setTimelineLimit] = useState(10);
  const { data: timelineActivities = [] } = useQuery({
    queryKey: ["client-activity", activityClientId, timelineLimit],
    enabled: !!activityClientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_activity")
        .select("*")
        .eq("client_id", activityClientId!)
        .order("created_at", { ascending: false })
        .limit(timelineLimit);
      return (data || []) as Array<{
        id: string;
        activity_type: string;
        title: string;
        description: string | null;
        created_at: string;
        visible_to_client: boolean;
      }>;
    },
  });

  // Staff users for assignee selector
  const { data: staffUsers = [] } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
      if (!roles?.length) return [];
      const staffIds = [...new Set(roles.map(r => r.user_id))];
      const { data } = await supabase.from("users").select("id, name, email").in("id", staffIds);
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
  const currentRecommendedId: string | null = whatsNewClientData ? (whatsNewClientData as any).recommended_item_id : null;

  const toggleAddon = (addonId: string) => {
    if (!whatsNewClient) return;
    const updated = currentAddons.includes(addonId)
      ? currentAddons.filter((a) => a !== addonId)
      : [...currentAddons, addonId];
    updateWhatsNew.mutate({ id: whatsNewClient, addons: updated });
  };

  const setRecommended = async (itemId: string | null) => {
    if (!whatsNewClient) return;
    await supabase.from("clients").update({ recommended_item_id: itemId } as any).eq("id", whatsNewClient);
    queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    toast.success("Recommended item updated");
  };

  const openEditClient = (client: any) => {
    setEditClient(client);
    setEditName(client.name);
    setEditStatus(client.status);
    setEditPlanId(client.plan_id || "");
    setEditAssistants(client.assistants_can_approve);
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
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
          <p className="text-sm text-muted-foreground">Select which marketplace items appear in this client's "What's New" section and set a recommended upsell.</p>
          
          <div className="mb-4">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommended Item</Label>
            <Select value={currentRecommendedId || "__auto__"} onValueChange={(v) => setRecommended(v === "__auto__" ? null : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Auto (most recent)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto (most recent)</SelectItem>
                {marketplaceItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.category})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Visible Items</p>
          <div className="space-y-3">
            {marketplaceItems.map((item: any) => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={currentAddons.includes(item.id)}
                  onCheckedChange={() => toggleAddon(item.id)}
                />
                <span className="text-sm">{item.name}</span>
                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
              </label>
            ))}
            {marketplaceItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No marketplace items yet. Add them in the Marketplace page.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
        <DialogContent className="max-w-lg">
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={() => updateClient.mutate()} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Media Dialog */}
      <Dialog open={!!mediaClientId} onOpenChange={(o) => { if (!o) setMediaClientId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Media — {mediaClientName}</DialogTitle></DialogHeader>
          {mediaLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No published media yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {mediaItems.map((post: any) => (
                <Card key={post.id} className="overflow-hidden">
                  <AspectRatio ratio={1}>
                    {post.creative_url ? (
                      isVoiceNote(post.creative_url) ? (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2 p-4">
                          <Mic className="h-8 w-8 text-primary/50" />
                          <audio src={post.creative_url} controls className="w-full max-w-[90%]" onClick={(e) => e.stopPropagation()} />
                        </div>
                      ) : isVideo(post.creative_url) ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><Film className="h-8 w-8 text-muted-foreground/50" /></div>
                      ) : (
                        <img src={post.creative_url} alt={post.title} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground/50" /></div>
                    )}
                  </AspectRatio>
                  <CardContent className="p-2.5">
                    <p className="text-xs font-medium truncate">{post.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      {post.platform && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.platform}</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(post.scheduled_at || post.created_at), "MMM d")}</span>
                    </div>
                    {post.creative_url && (
                      <div className="flex gap-1.5 mt-1.5">
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => handleDownload(post.creative_url)}>
                          <Download className="h-3 w-3 mr-0.5" />Download
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => handleCopyLink(post.creative_url)}>
                          <Link2 className="h-3 w-3 mr-0.5" />Link
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Activity Dialog */}
      <Dialog open={!!activityClientId} onOpenChange={(o) => { if (!o) setActivityClientId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Activity — {activityClientName}</DialogTitle>
              {activityClientId && <AddActivityDialog clientId={activityClientId} />}
            </div>
          </DialogHeader>

          {/* Timeline Section */}
          <div className="space-y-2 border-b pb-4 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Timeline
            </p>
            <ActivityTimeline
              activities={timelineActivities}
              isSSRole={true}
              hasMore={timelineActivities.length === timelineLimit}
              onLoadMore={() => setTimelineLimit((l) => l + 10)}
            />
          </div>

          {activityData ? (
            <div className="space-y-5">
              {/* Requests */}
              {activityData.requests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><MessageSquarePlus className="h-3.5 w-3.5" /> Requests ({activityData.requests.length})</p>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setActivityClientId(null); navigate("/requests"); }}>
                      View All <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  {activityData.requests.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-sm pl-5 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => { setActivityClientId(null); navigate("/requests"); }}>
                      <span className="truncate">{r.topic}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {activityData.projects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5" /> Projects ({activityData.projects.length})</p>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setActivityClientId(null); navigate("/team/projects"); }}>
                      View All <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  {activityData.projects.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm pl-5 py-1.5 rounded-md hover:bg-muted/50 group">
                      <span className="truncate cursor-pointer" onClick={() => { setActivityClientId(null); navigate("/team/projects"); }}>{p.name}</span>
                      <Select value={p.status} onValueChange={async (v) => {
                        await supabase.from("projects").update({ status: v }).eq("id", p.id);
                        queryClient.invalidateQueries({ queryKey: ["client-activity", activityClientId] });
                        toast.success("Project status updated");
                      }}>
                        <SelectTrigger className="h-6 w-24 text-[10px] border-transparent group-hover:border-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {activityData.tasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><ListTodo className="h-3.5 w-3.5" /> Tasks ({activityData.tasks.length})</p>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setActivityClientId(null); navigate("/team/tasks"); }}>
                      View All <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  {activityData.tasks.map((t: any) => {
                    const assignee = staffUsers.find((u: any) => u.id === t.assigned_to_user_id);
                    return (
                      <div key={t.id} className="flex items-center justify-between text-sm pl-5 py-1.5 rounded-md hover:bg-muted/50 group gap-2">
                        <span className="truncate cursor-pointer" onClick={() => { setActivityClientId(null); navigate("/team/tasks"); }}>{t.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {assignee && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <User className="h-3 w-3" />{(assignee.name || assignee.email || "").slice(0, 8)}
                            </span>
                          )}
                          <Select value={t.assigned_to_user_id || "__none__"} onValueChange={async (v) => {
                            await supabase.from("tasks").update({ assigned_to_user_id: v === "__none__" ? null : v } as any).eq("id", t.id);
                            queryClient.invalidateQueries({ queryKey: ["client-activity", activityClientId] });
                            toast.success("Assignee updated");
                          }}>
                            <SelectTrigger className="h-6 w-20 text-[10px] border-transparent group-hover:border-input">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Unassigned</SelectItem>
                              {staffUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={t.status} onValueChange={async (v) => {
                            await supabase.from("tasks").update({ status: v } as any).eq("id", t.id);
                            queryClient.invalidateQueries({ queryKey: ["client-activity", activityClientId] });
                            toast.success("Task status updated");
                          }}>
                            <SelectTrigger className="h-6 w-24 text-[10px] border-transparent group-hover:border-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Think Tank */}
              {activityData.thinkTank.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Think Tank ({activityData.thinkTank.length})</p>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setActivityClientId(null); navigate("/team/think-tank"); }}>
                      View All <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  {activityData.thinkTank.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between text-sm pl-5 py-1.5 rounded-md hover:bg-muted/50 group">
                      <span className="truncate cursor-pointer" onClick={() => { setActivityClientId(null); navigate("/team/think-tank"); }}>{i.title}</span>
                      <Select value={i.status} onValueChange={async (v) => {
                        await supabase.from("think_tank_items").update({ status: v } as any).eq("id", i.id);
                        queryClient.invalidateQueries({ queryKey: ["client-activity", activityClientId] });
                        toast.success("Status updated");
                      }}>
                        <SelectTrigger className="h-6 w-24 text-[10px] border-transparent group-hover:border-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="actioned">Actioned</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {activityData.projects.length === 0 && activityData.tasks.length === 0 && activityData.thinkTank.length === 0 && activityData.requests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No linked activity yet.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {clients.map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { if (isSSAdmin) openEditClient(c); }}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">Plan: {c.plans?.name || "None"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate(`/admin/client-strategy/${c.id}`)}>
                    <Target className="h-3.5 w-3.5" />Strategy
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { setMediaClientId(c.id); setMediaClientName(c.name); }}>
                    <Image className="h-3.5 w-3.5" />Media
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { setActivityClientId(c.id); setActivityClientName(c.name); }}>
                    <Activity className="h-3.5 w-3.5" />Activity
                  </Button>
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
