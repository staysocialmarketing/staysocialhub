import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Lightbulb, FileText, Brain, Archive, Zap, Send, FolderOpen, ListTodo, ChevronDown, Pencil, Trash2, Sparkles } from "lucide-react";
import AIFieldsPanel from "@/components/AIFieldsPanel";
import StrategyBriefPanel from "@/components/StrategyBriefPanel";
import RunStrategyButton from "@/components/RunStrategyButton";
import { toast } from "sonner";
import { format } from "date-fns";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";

interface ThinkTankItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  status: string;
  created_by_user_id: string;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  idea: <Lightbulb className="h-4 w-4" />,
  meeting_note: <FileText className="h-4 w-4" />,
  brainstorm: <Brain className="h-4 w-4" />,
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  idea: "default",
  meeting_note: "secondary",
  brainstorm: "outline",
};

export default function ThinkTank() {
  const { profile, isSSAdmin } = useAuth();
  const [items, setItems] = useState<ThinkTankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("idea");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [requestItem, setRequestItem] = useState<ThinkTankItem | null>(null);

  // Action dialogs
  const [createProjectItem, setCreateProjectItem] = useState<ThinkTankItem | null>(null);
  const [createTaskItem, setCreateTaskItem] = useState<ThinkTankItem | null>(null);
  const [actionName, setActionName] = useState("");
  const [actionDesc, setActionDesc] = useState("");
  const [actionClientId, setActionClientId] = useState("");
  const [actionParentProjectId, setActionParentProjectId] = useState("");
  const [actionProjectId, setActionProjectId] = useState("");
  const [actionPriority, setActionPriority] = useState("normal");
  const [actionAssigneeId, setActionAssigneeId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null; parent_project_id: string | null }[]>([]);
  const [staffUsers, setStaffUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  // Edit state
  const [editItem, setEditItem] = useState<ThinkTankItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editType, setEditType] = useState("idea");
  const [editClientId, setEditClientId] = useState("");

  const canEditDelete = (item: ThinkTankItem) => isSSAdmin || item.created_by_user_id === profile?.id;

  const fetchItems = async () => {
    let query = supabase.from("think_tank_items").select("*").order("created_at", { ascending: false });
    if (filterType !== "all") query = query.eq("type", filterType);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data } = await query;
    setItems((data as ThinkTankItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    supabase.from("clients").select("id, name").then(({ data }) => setClients(data || []));
    supabase.from("users").select("id, name, email").then(({ data }) => setUsers(data || []));
  }, [filterType, filterStatus]);

  const handleCreate = async () => {
    if (!title.trim() || !profile) return;
    const { error } = await supabase.from("think_tank_items").insert({
      title: title.trim(),
      body: body.trim() || null,
      type,
      created_by_user_id: profile.id,
      client_id: selectedClientId || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Idea added!");
    setTitle(""); setBody(""); setType("idea"); setSelectedClientId(""); setDialogOpen(false);
    fetchItems();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("think_tank_items").update({ status } as any).eq("id", id);
    fetchItems();
  };

  const openEdit = (item: ThinkTankItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditBody(item.body || "");
    setEditType(item.type);
    setEditClientId(item.client_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editTitle.trim()) return;
    const { error } = await supabase.from("think_tank_items").update({
      title: editTitle.trim(),
      body: editBody.trim() || null,
      type: editType,
      client_id: editClientId || null,
    } as any).eq("id", editItem.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item updated!");
    setEditItem(null);
    fetchItems();
  };

  const handleDeleteItem = async () => {
    if (!editItem) return;
    const { error } = await supabase.from("think_tank_items").delete().eq("id", editItem.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item deleted");
    setEditItem(null);
    fetchItems();
  };

  const handleCreateProject = async () => {
    if (!actionName.trim() || !profile || !createProjectItem) return;
    const { error } = await supabase.from("projects").insert({
      name: actionName.trim(),
      description: actionDesc.trim() || null,
      created_by_user_id: profile.id,
      client_id: createProjectItem.client_id || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    await updateStatus(createProjectItem.id, "actioned");
    toast.success("Project created from idea!");
    setCreateProjectItem(null);
    setActionName(""); setActionDesc("");
  };

  const handleCreateTask = async () => {
    if (!actionName.trim() || !profile || !createTaskItem) return;
    const { error } = await supabase.from("tasks").insert({
      title: actionName.trim(),
      description: actionDesc.trim() || null,
      created_by_user_id: profile.id,
      client_id: createTaskItem.client_id || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    await updateStatus(createTaskItem.id, "actioned");
    toast.success("Task created from idea!");
    setCreateTaskItem(null);
    setActionName(""); setActionDesc("");
  };

  const openCreateProject = (item: ThinkTankItem) => {
    setActionName(item.title);
    setActionDesc(item.body || "");
    setCreateProjectItem(item);
  };

  const openCreateTask = (item: ThinkTankItem) => {
    setActionName(item.title);
    setActionDesc(item.body || "");
    setCreateTaskItem(item);
  };

  const creatorName = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u?.name || u?.email || "Unknown";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Think Tank</h1>
          <p className="text-sm text-muted-foreground">Ideas, meeting notes, and brainstorming</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Idea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Think Tank Item</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Details / notes..." value={body} onChange={(e) => setBody(e.target.value)} />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">💡 Idea</SelectItem>
                  <SelectItem value="meeting_note">📝 Meeting Note</SelectItem>
                  <SelectItem value="brainstorm">🧠 Brainstorm</SelectItem>
                </SelectContent>
              </Select>
              <ClientSelectWithCreate value={selectedClientId} onValueChange={setSelectedClientId} placeholder="Link to client (optional)" />
              <Button className="w-full" onClick={handleCreate} disabled={!title.trim()}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="idea">Ideas</SelectItem>
            <SelectItem value="meeting_note">Meeting Notes</SelectItem>
            <SelectItem value="brainstorm">Brainstorms</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No items yet. Start capturing ideas!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={typeBadgeVariant[item.type] || "secondary"} className="flex items-center gap-1">
                      {typeIcons[item.type]} {item.type.replace("_", " ")}
                    </Badge>
                    {canEditDelete(item) && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {item.body && <p className="text-sm text-muted-foreground line-clamp-3">{item.body}</p>}
                {(item as any).ai_summary && (
                  <Badge variant="secondary" className="text-[10px]">AI: {(item as any).ai_summary.slice(0, 50)}...</Badge>
                )}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>By {creatorName(item.created_by_user_id)} · {format(new Date(item.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {item.status === "open" && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Zap className="h-3 w-3 mr-1" /> Action <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openCreateProject(item)}>
                            <FolderOpen className="h-4 w-4 mr-2" /> Create Project
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCreateTask(item)}>
                            <ListTodo className="h-4 w-4 mr-2" /> Create Task
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRequestItem(item)}>
                            <Send className="h-4 w-4 mr-2" /> Make Request
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const { error } = await supabase.functions.invoke("run-strategy", {
                                body: { item_type: "think_tank", item_id: item.id },
                              });
                              if (error) throw error;
                              toast.success("Strategy request sent to automation");
                            } catch { toast.error("Failed to run strategy"); }
                          }}>
                            <Sparkles className="h-4 w-4 mr-2" /> Run Strategy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(item.id, "archived")}>
                        <Archive className="h-3 w-3 mr-1" /> Archive
                      </Button>
                    </>
                  )}
                  {item.status === "archived" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "open")}>Reopen</Button>
                  )}
                  {item.status === "actioned" && (
                    <Badge variant="secondary">Actioned</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Think Tank Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Details</Label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">💡 Idea</SelectItem>
                  <SelectItem value="meeting_note">📝 Meeting Note</SelectItem>
                  <SelectItem value="brainstorm">🧠 Brainstorm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={editClientId} onValueChange={setEditClientId} />
            </div>
            {editItem && (
              <div className="space-y-2 pt-2 border-t">
                <AIFieldsPanel fields={editItem as any} />
                <StrategyBriefPanel brief={(editItem as any).strategy_brief} />
                <RunStrategyButton itemType="think_tank" itemId={editItem.id} />
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {editItem && canEditDelete(editItem) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project from Think Tank */}
      <Dialog open={!!createProjectItem} onOpenChange={(o) => !o && setCreateProjectItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Project from Idea</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <Input value={actionName} onChange={(e) => setActionName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateProjectItem(null)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!actionName.trim()}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task from Think Tank */}
      <Dialog open={!!createTaskItem} onOpenChange={(o) => !o && setCreateTaskItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task from Idea</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Task Title</Label>
              <Input value={actionName} onChange={(e) => setActionName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateTaskItem(null)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!actionName.trim()}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MakeRequestDialog
        open={!!requestItem}
        onOpenChange={(o) => !o && setRequestItem(null)}
        prefillTopic={requestItem?.title || ""}
        prefillNotes={requestItem?.body || ""}
        onSuccess={fetchItems}
      />
    </div>
  );
}
