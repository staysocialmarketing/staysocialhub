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
import { Plus, ChevronDown, FolderOpen, ListTodo, Send, Pencil, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
interface Project {
  id: string;
  name: string;
  description: string | null;
  parent_project_id: string | null;
  client_id: string | null;
  status: string;
  created_by_user_id: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  due_at: string | null;
  project_id: string | null;
  created_by_user_id: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-500/20",
  completed: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  on_hold: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  archived: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  urgent: "bg-red-500/15 text-red-700 border-red-500/20",
};

export default function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentProjectId, setParentProjectId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [ssUsers, setSsUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [requestProject, setRequestProject] = useState<Project | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Add task from project state
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);
  const [addTaskTitle, setAddTaskTitle] = useState("");
  const [addTaskDescription, setAddTaskDescription] = useState("");
  const [addTaskAssigneeId, setAddTaskAssigneeId] = useState("");
  const [addTaskPriority, setAddTaskPriority] = useState("normal");
  const [addTaskDueAt, setAddTaskDueAt] = useState("");

  // Edit project state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Edit task state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskProjectId, setEditTaskProjectId] = useState("");
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("normal");
  const [editTaskDueAt, setEditTaskDueAt] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState("todo");

  const fetchData = async () => {
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data } = await query;
    setProjects((data as Project[]) || []);

    const { data: tasks } = await supabase.from("tasks").select("id, title, description, status, priority, assigned_to_user_id, due_at, project_id, created_by_user_id");
    if (tasks) {
      const grouped: Record<string, Task[]> = {};
      (tasks as Task[]).forEach((t) => {
        if (t.project_id) {
          if (!grouped[t.project_id]) grouped[t.project_id] = [];
          grouped[t.project_id].push(t);
        }
      });
      setProjectTasks(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    supabase.from("clients").select("id, name").then(({ data }) => setClients(data || []));
    supabase.from("users").select("id, name, email").then(({ data: allUsers }) => {
      setUsers(allUsers || []);
      // Filter to SS roles only for assignee dropdowns
      supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops"]).then(({ data: roles }) => {
        const ssIds = new Set((roles || []).map((r: any) => r.user_id));
        setSsUsers((allUsers || []).filter((u: any) => ssIds.has(u.id)));
      });
    });
  }, [filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openEditProject = (project: Project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditClientId(project.client_id || "");
    setEditParentId(project.parent_project_id || "");
    setEditStatus(project.status);
  };

  const handleSaveProject = async () => {
    if (!editProject || !editName.trim()) return;
    const { error } = await supabase.from("projects").update({
      name: editName.trim(),
      description: editDescription.trim() || null,
      client_id: editClientId || null,
      parent_project_id: editParentId || null,
      status: editStatus,
    } as any).eq("id", editProject.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project updated!");
    setEditProject(null);
    fetchData();
  };

  const openEditTask = (task: Task) => {
    setEditTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskProjectId(task.project_id || "");
    setEditTaskAssigneeId(task.assigned_to_user_id || "");
    setEditTaskPriority(task.priority);
    setEditTaskDueAt(task.due_at ? task.due_at.slice(0, 16) : "");
    setEditTaskStatus(task.status);
  };

  const handleSaveTask = async () => {
    if (!editTask || !editTaskTitle.trim()) return;
    const { error } = await supabase.from("tasks").update({
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim() || null,
      project_id: editTaskProjectId || null,
      assigned_to_user_id: editTaskAssigneeId || null,
      priority: editTaskPriority,
      due_at: editTaskDueAt || null,
      status: editTaskStatus,
    } as any).eq("id", editTask.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task updated!");
    setEditTask(null);
    fetchData();
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status } as any).eq("id", id);
    fetchData();
  };

  const handleCreate = async () => {
    if (!name.trim() || !profile) return;
    const { error } = await supabase.from("projects").insert({
      name: name.trim(),
      description: description.trim() || null,
      parent_project_id: parentProjectId || null,
      client_id: selectedClientId || null,
      created_by_user_id: profile.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Project created!");
    setName(""); setDescription(""); setParentProjectId(""); setSelectedClientId(""); setDialogOpen(false);
    fetchData();
  };

  const topLevel = projects.filter((p) => !p.parent_project_id);
  const subProjectsOf = (parentId: string) => projects.filter((p) => p.parent_project_id === parentId);
  const clientName = (clientId: string | null) => clients.find((c) => c.id === clientId)?.name;
  const userName = (id: string | null) => {
    if (!id) return null;
    const u = users.find((u) => u.id === id);
    return u?.name || u?.email;
  };

  const renderTaskRow = (task: Task) => (
    <div
      key={task.id}
      className="flex items-center justify-between p-2 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <ListTodo className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{task.title}</span>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {userName(task.assigned_to_user_id) && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><User className="h-3 w-3" />{userName(task.assigned_to_user_id)}</span>
        )}
        {task.due_at && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Calendar className="h-3 w-3" />{format(new Date(task.due_at), "MMM d")}</span>
        )}
        <Select value={task.status} onValueChange={(s) => updateTaskStatus(task.id, s)}>
          <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">High-level project tracking with sub-projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              <ClientSelectWithCreate value={selectedClientId} onValueChange={setSelectedClientId} placeholder="Link to client (optional)" />
              <Select value={parentProjectId || "__none__"} onValueChange={(v) => setParentProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Parent project (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {projects.filter((p) => !p.parent_project_id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : topLevel.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No projects yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {topLevel.map((project) => {
            const subs = subProjectsOf(project.id);
            const tasks = projectTasks[project.id] || [];
            const isExpanded = expandedIds.has(project.id);
            return (
              <Card key={project.id}>
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="outline" className={statusColors[project.status] || ""}>{project.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      {clientName(project.client_id) && <Badge variant="secondary">{clientName(project.client_id)}</Badge>}
                      <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" /> {tasks.length} tasks</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditProject(project)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setRequestProject(project)}>
                        <Send className="h-3 w-3 mr-1" /> Request
                      </Button>
                    </div>
                  </div>
                  {project.description && <p className="text-sm text-muted-foreground mt-1 ml-8">{project.description}</p>}
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {subs.length > 0 && (
                      <div className="pl-6 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sub-projects</p>
                        {subs.map((sub) => {
                          const subTasks = projectTasks[sub.id] || [];
                          const subExpanded = expandedIds.has(sub.id);
                          return (
                            <div key={sub.id}>
                              <div
                                className="flex items-center justify-between p-2 rounded-md border cursor-pointer hover:bg-accent/50"
                                onClick={() => toggleExpand(sub.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${subExpanded ? "" : "-rotate-90"}`} />
                                  <FolderOpen className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{sub.name}</span>
                                  <Badge variant="outline" className={`text-xs ${statusColors[sub.status] || ""}`}>{sub.status}</Badge>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ListTodo className="h-3 w-3" /> {subTasks.length}
                                  </span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditProject(sub)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {subExpanded && subTasks.length > 0 && (
                                <div className="pl-8 pt-1 space-y-1">
                                  {subTasks.map(renderTaskRow)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {tasks.length > 0 ? (
                      <div className="pl-6 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</p>
                        {tasks.map(renderTaskRow)}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pl-6">No tasks linked to this project.</p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={editClientId} onValueChange={setEditClientId} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Parent Project</Label>
              <Select value={editParentId || "__none__"} onValueChange={(v) => setEditParentId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {projects.filter((p) => !p.parent_project_id && p.id !== editProject?.id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={editTaskDescription} onChange={(e) => setEditTaskDescription(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <Select value={editTaskProjectId || "__none__"} onValueChange={(v) => setEditTaskProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select value={editTaskAssigneeId || "__none__"} onValueChange={(v) => setEditTaskAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={editTaskPriority} onValueChange={setEditTaskPriority}>
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
              <Select value={editTaskStatus} onValueChange={setEditTaskStatus}>
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
              <Input type="datetime-local" value={editTaskDueAt} onChange={(e) => setEditTaskDueAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={!editTaskTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MakeRequestDialog
        open={!!requestProject}
        onOpenChange={(o) => !o && setRequestProject(null)}
        prefillTopic={requestProject?.name || ""}
        prefillNotes={requestProject?.description || ""}
        onSuccess={fetchData}
      />
    </div>
  );
}
