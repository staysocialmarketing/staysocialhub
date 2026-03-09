import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ChevronDown, FolderOpen, ListTodo, Send, Pencil, User, Calendar, Trash2, CheckSquare, Paperclip, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";
import TaskDetailDialog from "@/components/TaskDetailDialog";

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
  assigned_to_team: boolean;
  due_at: string | null;
  project_id: string | null;
  client_id: string | null;
  created_by_user_id: string;
  created_at: string;
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
  const { profile, isSSAdmin, isSSRole } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [projectStats, setProjectStats] = useState<Record<string, { checklist: number; checklistDone: number; attachments: number; comments: number }>>({});
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

  // Selected task for detail view
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const canEditDeleteProject = (p: Project) => isSSRole || p.created_by_user_id === profile?.id;
  const canEditDeleteTask = (t: Task) => isSSRole || t.created_by_user_id === profile?.id;

  const fetchData = async () => {
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (globalClientId) query = query.eq("client_id", globalClientId);
    const { data } = await query;
    setProjects((data as Project[]) || []);

    const { data: tasks } = await supabase.from("tasks").select("id, title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, client_id, created_by_user_id, created_at");
    if (tasks) {
      const grouped: Record<string, Task[]> = {};
      (tasks as Task[]).forEach((t) => {
        if (t.project_id) {
          if (!grouped[t.project_id]) grouped[t.project_id] = [];
          grouped[t.project_id].push(t);
        }
      });
      setProjectTasks(grouped);

      // Fetch rollup stats for all task IDs
      const allTaskIds = (tasks as Task[]).filter(t => t.project_id).map(t => t.id);
      if (allTaskIds.length > 0) {
        const [checklistRes, attachRes, commentRes] = await Promise.all([
          supabase.from("task_checklist_items").select("task_id, completed").in("task_id", allTaskIds),
          supabase.from("task_attachments").select("task_id").in("task_id", allTaskIds),
          supabase.from("comments").select("task_id").in("task_id", allTaskIds).not("task_id", "is", null),
        ]);

        const stats: Record<string, { checklist: number; checklistDone: number; attachments: number; comments: number }> = {};
        const taskToProject: Record<string, string> = {};
        (tasks as Task[]).forEach(t => { if (t.project_id) taskToProject[t.id] = t.project_id; });

        const initStats = (pid: string) => {
          if (!stats[pid]) stats[pid] = { checklist: 0, checklistDone: 0, attachments: 0, comments: 0 };
        };

        (checklistRes.data || []).forEach((c: any) => {
          const pid = taskToProject[c.task_id]; if (!pid) return;
          initStats(pid); stats[pid].checklist++; if (c.completed) stats[pid].checklistDone++;
        });
        (attachRes.data || []).forEach((a: any) => {
          const pid = taskToProject[a.task_id]; if (!pid) return;
          initStats(pid); stats[pid].attachments++;
        });
        (commentRes.data || []).forEach((c: any) => {
          const pid = taskToProject[c.task_id]; if (!pid) return;
          initStats(pid); stats[pid].comments++;
        });
        setProjectStats(stats);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    supabase.from("clients").select("id, name").then(({ data }) => setClients(data || []));
    supabase.from("users").select("id, name, email").then(({ data: allUsers }) => {
      setUsers(allUsers || []);
      supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops"]).then(({ data: roles }) => {
        const ssIds = new Set((roles || []).map((r: any) => r.user_id));
        setSsUsers((allUsers || []).filter((u: any) => ssIds.has(u.id)));
      });
    });
  }, [filterStatus, globalClientId]);

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

  const handleDeleteProject = async () => {
    if (!editProject) return;
    const { error } = await supabase.from("projects").delete().eq("id", editProject.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project deleted");
    setEditProject(null);
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
  const userName = (id: string | null, isTeam?: boolean) => {
    if (isTeam) return "Team";
    if (!id) return null;
    const u = users.find((u) => u.id === id);
    return u?.name || u?.email;
  };

  const renderTaskRow = (task: Task) => (
    <div
      key={task.id}
      className="flex items-center justify-between p-3 rounded-lg bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors group"
      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <ListTodo className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{task.title}</span>
        <Badge variant="outline" className={`text-[11px] shrink-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {(userName(task.assigned_to_user_id, task.assigned_to_team)) && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 hidden sm:flex">
            <User className="h-3 w-3" />
            {task.assigned_to_team ? "Team" : userName(task.assigned_to_user_id)}
          </span>
        )}
        {task.due_at && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 hidden sm:flex"><Calendar className="h-3 w-3" />{format(new Date(task.due_at), "MMM d")}</span>
        )}
        <Select value={task.status} onValueChange={(s) => updateTaskStatus(task.id, s)}>
          <SelectTrigger className="h-7 text-[11px] w-24 border-border/50 bg-transparent"><SelectValue /></SelectTrigger>
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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">High-level project tracking</p>
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
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
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
              <Card key={project.id} className="border-border/40 shadow-sm hover:shadow-md transition-all">
                <div
                  className="p-5 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
                      <Badge variant="outline" className={`text-[11px] ${statusColors[project.status] || ""}`}>{project.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      {clientName(project.client_id) && <Badge variant="outline" className="text-[11px]">{clientName(project.client_id)}</Badge>}
                      {(() => {
                        const directTasks = tasks.filter(t => t.status !== "done");
                        const subIds = subs.map(s => s.id);
                        const subTaskCount = Object.entries(projectTasks).filter(([pid]) => subIds.includes(pid)).reduce((sum, [, ts]) => sum + ts.filter(t => t.status !== "done").length, 0);
                        const total = directTasks.filter(t => t.status !== "done").length + subTaskCount;
                        return <span className="text-xs text-muted-foreground">{total} task{total !== 1 ? "s" : ""}</span>;
                      })()}
                      {canEditDeleteProject(project) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditProject(project)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRequestProject(project)}>
                        <Send className="h-3 w-3 mr-1" /> Request
                      </Button>
                    </div>
                  </div>
                  {project.description && <p className="text-sm text-muted-foreground/70 mt-2 ml-8 line-clamp-1">{project.description}</p>}
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 space-y-4">
                    {/* Project rollup stats */}
                    {(() => {
                      const allProjectIds = [project.id, ...subs.map(s => s.id)];
                      const combined = { checklist: 0, checklistDone: 0, attachments: 0, comments: 0 };
                      allProjectIds.forEach(pid => {
                        const s = projectStats[pid];
                        if (s) { combined.checklist += s.checklist; combined.checklistDone += s.checklistDone; combined.attachments += s.attachments; combined.comments += s.comments; }
                      });
                      if (combined.checklist === 0 && combined.attachments === 0 && combined.comments === 0) return null;
                      return (
                        <div className="flex gap-3 pl-6 flex-wrap">
                          {combined.checklist > 0 && (
                            <Badge variant="outline" className="text-[11px] gap-1">
                              <CheckSquare className="h-3 w-3" /> {combined.checklistDone}/{combined.checklist} checklist
                            </Badge>
                          )}
                          {combined.attachments > 0 && (
                            <Badge variant="outline" className="text-[11px] gap-1">
                              <Paperclip className="h-3 w-3" /> {combined.attachments} file{combined.attachments !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {combined.comments > 0 && (
                            <Badge variant="outline" className="text-[11px] gap-1">
                              <MessageSquare className="h-3 w-3" /> {combined.comments} comment{combined.comments !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                    {subs.length > 0 && (
                      <div className="pl-6 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sub-projects</p>
                        {subs.map((sub) => {
                          const subTasks = projectTasks[sub.id] || [];
                          const subExpanded = expandedIds.has(sub.id);
                          return (
                            <div key={sub.id}>
                              <div
                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                                onClick={() => toggleExpand(sub.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${subExpanded ? "" : "-rotate-90"}`} />
                                  <FolderOpen className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{sub.name}</span>
                                  <Badge variant="outline" className={`text-[11px] ${statusColors[sub.status] || ""}`}>{sub.status}</Badge>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ListTodo className="h-3 w-3" /> {subTasks.length}
                                  </span>
                                  {canEditDeleteProject(sub) && (
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditProject(sub)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {sub.description && subExpanded && (
                                <p className="text-xs text-muted-foreground ml-8 mt-1 line-clamp-2">{sub.description}</p>
                              )}
                              {subExpanded && (
                                <div className="pl-8 pt-1 space-y-1">
                                  {subTasks.map(renderTaskRow)}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs mt-1"
                                    onClick={(e) => { e.stopPropagation(); setAddTaskProjectId(sub.id); }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Add Task
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="pl-6 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</p>
                      {tasks.length > 0 ? tasks.map(renderTaskRow) : (
                        <p className="text-xs text-muted-foreground">No tasks linked to this project.</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs mt-1"
                        onClick={(e) => { e.stopPropagation(); setAddTaskProjectId(project.id); }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Task
                      </Button>
                    </div>
                  </div>
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
          <DialogFooter className="flex justify-between sm:justify-between">
            {editProject && canEditDeleteProject(editProject) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this project. Tasks linked to it will remain but become unlinked.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProject}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditProject(null)}>Cancel</Button>
              {editProject && canEditDeleteProject(editProject) && (
                <Button onClick={handleSaveProject} disabled={!editName.trim()}>Save</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdated={fetchData}
        projects={projects}
        ssUsers={ssUsers}
        users={users}
      />

      {/* Add Task from Project Dialog */}
      <Dialog open={!!addTaskProjectId} onOpenChange={(o) => { if (!o) { setAddTaskProjectId(null); setAddTaskTitle(""); setAddTaskDescription(""); setAddTaskAssigneeId(""); setAddTaskPriority("normal"); setAddTaskDueAt(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Task to Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Task title" value={addTaskTitle} onChange={(e) => setAddTaskTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Description..." value={addTaskDescription} onChange={(e) => setAddTaskDescription(e.target.value)} />
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select value={addTaskAssigneeId || "__none__"} onValueChange={(v) => setAddTaskAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  <SelectItem value="__team__">🤝 Team (All Hands)</SelectItem>
                  {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={addTaskPriority} onValueChange={setAddTaskPriority}>
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
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <DatePickerField value={addTaskDueAt} onChange={setAddTaskDueAt} placeholder="Pick date" />
              </div>
            </div>
            <Button className="w-full" disabled={!addTaskTitle.trim()} onClick={async () => {
              if (!profile || !addTaskProjectId) return;
              const proj = projects.find((p) => p.id === addTaskProjectId);
              const isTeam = addTaskAssigneeId === "__team__";
              const { error } = await supabase.from("tasks").insert({
                title: addTaskTitle.trim(),
                description: addTaskDescription.trim() || null,
                project_id: addTaskProjectId,
                client_id: proj?.client_id || null,
                assigned_to_user_id: isTeam ? null : (addTaskAssigneeId || null),
                assigned_to_team: isTeam,
                priority: addTaskPriority,
                due_at: addTaskDueAt || null,
                created_by_user_id: profile.id,
              } as any);
              if (error) { toast.error(error.message); return; }
              toast.success("Task added!");
              setAddTaskProjectId(null); setAddTaskTitle(""); setAddTaskDescription(""); setAddTaskAssigneeId(""); setAddTaskPriority("normal"); setAddTaskDueAt("");
              fetchData();
            }}>Create Task</Button>
          </div>
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
