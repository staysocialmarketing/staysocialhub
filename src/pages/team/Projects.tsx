import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { taskStatusColors, taskStatusLabels, taskStatusColumns } from "@/lib/taskStatusUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";

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
  active: "bg-green-500/15 text-green-700 border-0",
  completed: "bg-blue-500/15 text-blue-700 border-0",
  on_hold: "bg-yellow-500/15 text-yellow-700 border-0",
  archived: "bg-muted text-muted-foreground border-0",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  urgent: "bg-red-500/15 text-red-700 border-red-500/20",
};

const statusFilterOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "archived", label: "Archived" },
];

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
      Object.values(grouped).forEach((taskList) => {
        taskList.sort((a, b) => {
          if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
          if (a.due_at && !b.due_at) return -1;
          if (!a.due_at && b.due_at) return 1;
          const cmp = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
          if (cmp !== 0) return cmp;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
      setProjectTasks(grouped);

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
      supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]).then(({ data: roles }) => {
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
    await supabase.from("tasks").update({ project_id: null }).eq("project_id", editProject.id);
    await supabase.from("think_tank_items").update({ project_id: null }).eq("project_id", editProject.id);
    const { error } = await supabase.from("projects").delete().eq("id", editProject.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project deleted");
    setEditProject(null);
    fetchData();
  };

  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [completingProjectIds, setCompletingProjectIds] = useState<Set<string>>(new Set());

  const updateTaskStatus = async (id: string, status: string, projectId?: string | null) => {
    if (status === "complete") {
      setCompletingTaskIds((prev) => new Set(prev).add(id));
      toast.success("🎉 Task complete!");
      setTimeout(async () => {
        await supabase.from("tasks").update({ status } as any).eq("id", id);
        setCompletingTaskIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        
        if (projectId) {
          const otherTasks = (projectTasks[projectId] || []).filter(t => t.id !== id);
          const allDone = otherTasks.every(t => t.status === "complete");
          if (allDone && otherTasks.length > 0) {
            setCompletingProjectIds((prev) => new Set(prev).add(projectId));
            await supabase.from("projects").update({ status: "completed" } as any).eq("id", projectId);
            toast.success("🎊 Project complete! All tasks finished!", { duration: 4000 });
            setTimeout(() => {
              setCompletingProjectIds((prev) => { const n = new Set(prev); n.delete(projectId); return n; });
            }, 800);
          }
        }
        fetchData();
      }, 500);
    } else {
      await supabase.from("tasks").update({ status } as any).eq("id", id);
      fetchData();
    }
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

  const getInitials = (id: string | null, isTeam?: boolean) => {
    if (isTeam) return "TM";
    const name = userName(id);
    if (!name) return null;
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const getTaskProgress = (projectId: string, subs: Project[]) => {
    const directTasks = projectTasks[projectId] || [];
    const subIds = subs.map(s => s.id);
    const subTasks = subIds.flatMap(id => projectTasks[id] || []);
    const allTasks = [...directTasks, ...subTasks];
    const completed = allTasks.filter(t => t.status === "complete").length;
    return { completed, total: allTasks.length };
  };

  const renderTaskRow = (task: Task) => (
    <div
      key={task.id}
      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors group/task ${completingTaskIds.has(task.id) ? "animate-task-complete" : ""}`}
      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm font-medium truncate">{task.title}</span>
        <Badge variant="outline" className={`text-[10px] shrink-0 border-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {getInitials(task.assigned_to_user_id, task.assigned_to_team) && (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0 hidden sm:flex">
            {getInitials(task.assigned_to_user_id, task.assigned_to_team)}
          </span>
        )}
        {task.due_at && (
          <span className="text-xs text-muted-foreground/70 flex items-center gap-0.5 hidden sm:flex"><Calendar className="h-3 w-3" />{format(new Date(task.due_at), "MMM d")}</span>
        )}
        <Select value={task.status} onValueChange={(s) => updateTaskStatus(task.id, s, task.project_id)}>
          <SelectTrigger className={`h-7 text-[11px] w-28 border-0 ${taskStatusColors[task.status] || "bg-muted/30"}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {taskStatusColumns.map((s) => (
              <SelectItem key={s} value={s}>{taskStatusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <Badge variant="secondary" className="text-xs font-medium">{topLevel.length}</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Project</Button>
          </DialogTrigger>
          <DialogContent className="shadow-float border-0">
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

      {/* Pill toggle filters */}
      <div className="flex gap-1.5 flex-wrap">
        {statusFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : topLevel.length === 0 ? (
        <div className="card-elevated py-16 text-center text-muted-foreground">No projects yet.</div>
      ) : (
        <div className="card-elevated divide-y divide-border/30">
          {topLevel.map((project) => {
            const subs = subProjectsOf(project.id);
            const tasks = projectTasks[project.id] || [];
            const isExpanded = expandedIds.has(project.id);
            const progress = getTaskProgress(project.id, subs);
            const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
            return (
              <div key={project.id} className={`${completingProjectIds.has(project.id) ? "animate-project-complete" : ""}`}>
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors group"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      <h3 className="text-sm font-bold text-foreground">{project.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[project.status] || ""}`}>{project.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      {clientName(project.client_id) && <Badge variant="secondary" className="text-[10px]">{clientName(project.client_id)}</Badge>}
                      {progress.total > 0 && (
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={progressPct} className="h-1.5" />
                          <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{progress.completed}/{progress.total}</span>
                        </div>
                      )}
                      {canEditDeleteProject(project) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditProject(project)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setRequestProject(project)}>
                        <Send className="h-3 w-3 mr-1" /> Request
                      </Button>
                    </div>
                  </div>
                  {project.description && <p className="text-xs text-muted-foreground/50 mt-1.5 ml-7 line-clamp-1">{project.description}</p>}
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
                        <div className="flex gap-2 pl-7 flex-wrap">
                          {combined.checklist > 0 && (
                            <Badge variant="secondary" className="text-[10px] gap-1 border-0">
                              <CheckSquare className="h-3 w-3" /> {combined.checklistDone}/{combined.checklist}
                            </Badge>
                          )}
                          {combined.attachments > 0 && (
                            <Badge variant="secondary" className="text-[10px] gap-1 border-0">
                              <Paperclip className="h-3 w-3" /> {combined.attachments}
                            </Badge>
                          )}
                          {combined.comments > 0 && (
                            <Badge variant="secondary" className="text-[10px] gap-1 border-0">
                              <MessageSquare className="h-3 w-3" /> {combined.comments}
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                    {subs.length > 0 && (
                      <div className="pl-7 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Sub-projects</p>
                        {subs.map((sub) => {
                          const subTasks = projectTasks[sub.id] || [];
                          const subExpanded = expandedIds.has(sub.id);
                          return (
                            <div key={sub.id}>
                              <div
                                className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-muted/20 transition-colors cursor-pointer"
                                onClick={() => toggleExpand(sub.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-3 w-3 text-muted-foreground/40 transition-transform ${subExpanded ? "" : "-rotate-90"}`} />
                                  <FolderOpen className="h-3 w-3 text-muted-foreground/50" />
                                  <span className="text-sm font-medium">{sub.name}</span>
                                  <Badge variant="outline" className={`text-[10px] ${statusColors[sub.status] || ""}`}>{sub.status}</Badge>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-muted-foreground/50">{subTasks.length} tasks</span>
                                  {canEditDeleteProject(sub) && (
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditProject(sub)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {subExpanded && (
                                <div className="ml-5 border-l border-border/20 pl-3 space-y-0.5">
                                  {sub.description && (
                                    <p className="text-xs text-muted-foreground/50 py-1 line-clamp-2">{sub.description}</p>
                                  )}
                                  {subTasks.map(renderTaskRow)}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-muted-foreground/60 mt-1"
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
                    <div className="pl-7 space-y-0.5">
                      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Tasks</p>
                      {tasks.length > 0 ? (
                        <div className="divide-y divide-border/20">
                          {tasks.map(renderTaskRow)}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/40 py-2">No tasks linked to this project.</p>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground/60 mt-1"
                        onClick={(e) => { e.stopPropagation(); setAddTaskProjectId(project.id); }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Task
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent className="max-w-lg shadow-float border-0">
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
        <DialogContent className="max-w-md shadow-float border-0">
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
