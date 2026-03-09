import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import { EmptyState } from "@/components/ui/empty-state";
import FilterBar, { useFilterBar, applyDueDateFilter, PRIORITY_FILTER_OPTIONS, DUE_DATE_FILTER_OPTIONS } from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";

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

const statusColumns = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  review: "Review",
  complete: "Complete",
};

export default function Tasks() {
  const { profile, isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const navigate = useNavigate();
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
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [requestTask, setRequestTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [ssUsers, setSsUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  useEffect(() => {
    if (profile && filterAssignee === "__pending__") {
      setFilterAssignee(isSSAdmin ? "all" : "mine");
    }
  }, [profile, isSSAdmin]);

  const fetchTasks = async () => {
    if (filterAssignee === "__pending__") return;
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (globalClientId) query = query.eq("client_id", globalClientId);
    if (filterProject !== "all") query = query.eq("project_id", filterProject);
    if (filterAssignee === "mine" && profile) {
      query = query.or(`assigned_to_user_id.eq.${profile.id},assigned_to_team.eq.true`);
    } else if (filterAssignee === "team") {
      query = query.eq("assigned_to_team", true);
    } else if (filterAssignee === "unassigned") {
      query = query.is("assigned_to_user_id", null).eq("assigned_to_team", false);
    } else if (filterAssignee !== "all") {
      query = query.eq("assigned_to_user_id", filterAssignee);
    }
    const { data } = await query;
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    supabase.from("projects").select("id, name").then(({ data }) => setProjects(data || []));
    supabase.from("users").select("id, name, email").then(({ data: allUsers }) => {
      setUsers(allUsers || []);
      supabase.from("user_roles").select("user_id, role").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]).then(({ data: roles }) => {
        const ssIds = new Set((roles || []).map((r: any) => r.user_id));
        setSsUsers((allUsers || []).filter((u: any) => ssIds.has(u.id)));
      });
    });
    supabase.from("clients").select("id, name").eq("status", "active").then(({ data }) => setClients(data || []));
  }, [filterProject, filterAssignee, globalClientId]);

  const handleCreate = async () => {
    if (!title.trim() || !profile) return;
    const isTeam = assigneeId === "__team__";
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      client_id: clientId || null,
      assigned_to_user_id: isTeam ? null : (assigneeId || null),
      assigned_to_team: isTeam,
      priority,
      due_at: dueAt || null,
      created_by_user_id: profile.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Task created!");
    setTitle(""); setDescription(""); setProjectId(""); setClientId(""); setAssigneeId(""); setAssignToTeam(false); setPriority("normal"); setDueAt(""); setDialogOpen(false);
    fetchTasks();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status } as any).eq("id", id);
    fetchTasks();
  };

  const userName = (task: Task) => {
    if (task.assigned_to_team) return "Team";
    if (!task.assigned_to_user_id) return null;
    const u = users.find((u) => u.id === task.assigned_to_user_id);
    return u?.name || u?.email;
  };

  const projectName = (id: string | null) => {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name;
  };

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tasks</h1>
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
              <Select value={assigneeId || "__none__"} onValueChange={(v) => { setAssigneeId(v === "__none__" ? "" : v); setAssignToTeam(v === "__team__"); }}>
                <SelectTrigger><SelectValue placeholder="Assign to (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  <SelectItem value="__team__">🤝 Team (All Hands)</SelectItem>
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

      <div className="flex gap-3 flex-wrap">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee === "__pending__" ? "mine" : filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Assignees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">My Tasks</SelectItem>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="team">🤝 Team Only</SelectItem>
            {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {statusColumns.map((col) => (
            <div key={col} className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 pb-2">
                <h2 className="text-sm font-semibold text-foreground">{statusLabels[col]}</h2>
                <span className="text-xs text-muted-foreground">{tasksByStatus(col).length}</span>
              </div>
              {tasksByStatus(col).length === 0 ? (
                <EmptyState title="No tasks" compact className="py-6" />
              ) : (
                tasksByStatus(col).map((task) => (
                  <div
                    key={task.id}
                    className="card-elevated p-4 space-y-3 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setEditTask(task)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-snug text-foreground">{task.title}</span>
                      <Badge variant="outline" className={`text-[11px] shrink-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground/70 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {projectName(task.project_id) && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] cursor-pointer hover:bg-secondary/80"
                          onClick={(e) => { e.stopPropagation(); navigate("/team/projects"); }}
                        >
                          {projectName(task.project_id)}
                        </Badge>
                      )}
                      {userName(task) && (
                        <span className="flex items-center gap-0.5">
                          <User className="h-3 w-3" />
                          {task.assigned_to_team ? "Team" : userName(task)}
                        </span>
                      )}
                      {task.due_at && (
                        <span className="flex items-center gap-0.5 ml-auto"><Calendar className="h-3 w-3" /> {format(new Date(task.due_at), "MMM d")}</span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select value={task.status} onValueChange={(s) => updateStatus(task.id, s)}>
                        <SelectTrigger className="h-7 text-[11px] w-full border-border/50 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusColumns.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      <TaskDetailDialog
        task={editTask}
        onClose={() => setEditTask(null)}
        onUpdated={fetchTasks}
        projects={projects}
        ssUsers={ssUsers}
        users={users}
      />

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
