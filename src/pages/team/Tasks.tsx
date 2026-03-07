import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Calendar, User, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";

interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  client_id: string | null;
  assigned_to_user_id: string | null;
  assigned_to_team: boolean;
  status: string;
  priority: string;
  due_at: string | null;
  created_by_user_id: string;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  urgent: "bg-red-500/15 text-red-700 border-red-500/20",
};

const statusColumns = ["todo", "in_progress", "done"] as const;
const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function Tasks() {
  const { profile, isSSAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("__pending__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignToTeam, setAssignToTeam] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [requestTask, setRequestTask] = useState<Task | null>(null);

  // Edit state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editDueAt, setEditDueAt] = useState("");
  const [editStatus, setEditStatus] = useState("todo");

  const [ssUsers, setSsUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  // Set default filter once profile loads
  useEffect(() => {
    if (profile && filterAssignee === "__pending__") {
      setFilterAssignee(isSSAdmin ? "all" : profile.id);
    }
  }, [profile, isSSAdmin]);

  const fetchTasks = async () => {
    if (filterAssignee === "__pending__") return;
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (filterProject !== "all") query = query.eq("project_id", filterProject);
    if (filterAssignee !== "all") query = query.eq("assigned_to_user_id", filterAssignee);
    const { data } = await query;
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    supabase.from("projects").select("id, name").then(({ data }) => setProjects(data || []));
    supabase.from("users").select("id, name, email").then(({ data: allUsers }) => {
      setUsers(allUsers || []);
      supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops"]).then(({ data: roles }) => {
        const ssIds = new Set((roles || []).map((r: any) => r.user_id));
        setSsUsers((allUsers || []).filter((u: any) => ssIds.has(u.id)));
      });
    });
    supabase.from("clients").select("id, name").eq("status", "active").then(({ data }) => setClients(data || []));
  }, [filterProject, filterAssignee]);

  const canEditDelete = (task: Task) => isSSAdmin || task.created_by_user_id === profile?.id;

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditProjectId(task.project_id || "");
    setEditClientId((task as any).client_id || "");
    setEditAssigneeId(task.assigned_to_user_id || "");
    setEditPriority(task.priority);
    setEditDueAt(task.due_at || "");
    setEditStatus(task.status);
  };

  const handleSaveEdit = async () => {
    if (!editTask || !editTitle.trim()) return;
    const { error } = await supabase.from("tasks").update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      project_id: editProjectId || null,
      client_id: editClientId || null,
      assigned_to_user_id: editAssigneeId || null,
      priority: editPriority,
      due_at: editDueAt || null,
      status: editStatus,
    } as any).eq("id", editTask.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task updated!");
    setEditTask(null);
    fetchTasks();
  };

  const handleDelete = async () => {
    if (!editTask) return;
    const { error } = await supabase.from("tasks").delete().eq("id", editTask.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    setEditTask(null);
    fetchTasks();
  };

  const handleCreate = async () => {
    if (!title.trim() || !profile) return;
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      client_id: clientId || null,
      assigned_to_user_id: assigneeId || null,
      priority,
      due_at: dueAt || null,
      created_by_user_id: profile.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Task created!");
    setTitle(""); setDescription(""); setProjectId(""); setClientId(""); setAssigneeId(""); setPriority("normal"); setDueAt(""); setDialogOpen(false);
    fetchTasks();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status } as any).eq("id", id);
    fetchTasks();
  };

  const userName = (id: string | null) => {
    if (!id) return null;
    const u = users.find((u) => u.id === id);
    return u?.name || u?.email;
  };

  const projectName = (id: string | null) => {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name;
  };

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">Daily task tracker across projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} placeholder="Client (optional)" />
              <Select value={projectId || "__none__"} onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Project (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={assigneeId || "__none__"} onValueChange={(v) => setAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Assign to (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <DatePickerField value={dueAt} onChange={setDueAt} placeholder="Pick due date" />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!title.trim()}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee === "__pending__" ? "all" : filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Assignees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusColumns.map((col) => (
            <div key={col} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <h2 className="font-semibold text-sm text-foreground">{statusLabels[col]}</h2>
                <Badge variant="secondary" className="text-xs">{tasksByStatus(col).length}</Badge>
              </div>
              {tasksByStatus(col).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                tasksByStatus(col).map((task) => (
                  <Card key={task.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(task)}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">{task.title}</span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {projectName(task.project_id) && <Badge variant="secondary" className="text-[10px]">{projectName(task.project_id)}</Badge>}
                        {userName(task.assigned_to_user_id) && (
                          <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> {userName(task.assigned_to_user_id)}</span>
                        )}
                        {task.due_at && (
                          <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {format(new Date(task.due_at), "MMM d")}</span>
                        )}
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select value={task.status} onValueChange={(s) => updateStatus(task.id, s)}>
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setRequestTask(task)}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={!canEditDelete(editTask!)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={!canEditDelete(editTask!)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={editClientId} onValueChange={setEditClientId} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <Select value={editProjectId || "__none__"} onValueChange={(v) => setEditProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select value={editAssigneeId || "__none__"} onValueChange={(v) => setEditAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <DatePickerField value={editDueAt} onChange={setEditDueAt} placeholder="Pick due date" />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {editTask && canEditDelete(editTask) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete task?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditTask(null)}>Cancel</Button>
              {editTask && canEditDelete(editTask) && (
                <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>Save</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MakeRequestDialog
        open={!!requestTask}
        onOpenChange={(o) => !o && setRequestTask(null)}
        prefillTopic={requestTask?.title || ""}
        prefillNotes={requestTask?.description || ""}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
