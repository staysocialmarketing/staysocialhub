import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronRight, FolderOpen, ListTodo } from "lucide-react";
import { toast } from "sonner";

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

const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-500/20",
  completed: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  on_hold: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  archived: "bg-muted text-muted-foreground",
};

export default function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentProjectId, setParentProjectId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const fetchProjects = async () => {
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data } = await query;
    setProjects((data as Project[]) || []);

    // Fetch task counts
    const { data: tasks } = await supabase.from("tasks").select("project_id");
    if (tasks) {
      const counts: Record<string, number> = {};
      tasks.forEach((t: any) => { if (t.project_id) counts[t.project_id] = (counts[t.project_id] || 0) + 1; });
      setTaskCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
    supabase.from("clients").select("id, name").then(({ data }) => setClients(data || []));
  }, [filterStatus]);

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
    fetchProjects();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("projects").update({ status } as any).eq("id", id);
    fetchProjects();
  };

  const topLevel = projects.filter((p) => !p.parent_project_id);
  const subProjectsOf = (parentId: string) => projects.filter((p) => p.parent_project_id === parentId);
  const clientName = (clientId: string | null) => clients.find((c) => c.id === clientId)?.name;

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
              <Select value={selectedClientId || "__none__"} onValueChange={(v) => setSelectedClientId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Link to client (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No client</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
            return (
              <Collapsible key={project.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {subs.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <Badge variant="outline" className={statusColors[project.status] || ""}>{project.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {clientName(project.client_id) && <Badge variant="secondary">{clientName(project.client_id)}</Badge>}
                        <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" /> {taskCounts[project.id] || 0} tasks</span>
                        <Select value={project.status} onValueChange={(s) => updateStatus(project.id, s)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {project.description && <p className="text-sm text-muted-foreground mt-1 ml-8">{project.description}</p>}
                  </CardHeader>
                  {subs.length > 0 && (
                    <CollapsibleContent>
                      <CardContent className="pt-0 pl-10 space-y-2">
                        {subs.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between p-2 rounded-md border">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{sub.name}</span>
                              <Badge variant="outline" className={`text-xs ${statusColors[sub.status] || ""}`}>{sub.status}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ListTodo className="h-3 w-3" /> {taskCounts[sub.id] || 0}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  )}
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
