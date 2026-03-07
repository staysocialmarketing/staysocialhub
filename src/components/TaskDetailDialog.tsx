import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Plus, Paperclip, Download, Link2, X, Send, FileText, ListChecks, MessageSquare, Activity, Pencil, Bot, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";
import AIFieldsPanel from "@/components/AIFieldsPanel";
import StrategyBriefPanel from "@/components/StrategyBriefPanel";
import RunStrategyButton from "@/components/RunStrategyButton";

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

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string | null;
  user_id: string;
  created_at: string;
}

const statusColumns = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
const statusLabels: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  waiting: "Waiting", review: "Review", complete: "Complete",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  urgent: "bg-red-500/15 text-red-700 border-red-500/20",
};

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onUpdated: () => void;
  projects: { id: string; name: string }[];
  ssUsers: { id: string; name: string | null; email: string }[];
  users: { id: string; name: string | null; email: string }[];
}

export default function TaskDetailDialog({ task, onClose, onUpdated, projects, ssUsers, users }: TaskDetailDialogProps) {
  const { profile, isSSAdmin, isSSRole } = useAuth();
  const canEdit = task ? (isSSAdmin || task.created_by_user_id === profile?.id) : false;

  const [editing, setEditing] = useState(false);

  // Task fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignToTeam, setAssignToTeam] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState("todo");

  // Sub-sections
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task) return;
    resetFields(task);
    setEditing(false);
    loadChecklist();
    loadAttachments();
    loadComments();
    loadActivity();
  }, [task?.id]);

  const resetFields = (t: Task) => {
    setTitle(t.title);
    setDescription(t.description || "");
    setProjectId(t.project_id || "");
    setClientId(t.client_id || "");
    setAssigneeId(t.assigned_to_team ? "__team__" : (t.assigned_to_user_id || ""));
    setAssignToTeam(t.assigned_to_team);
    setPriority(t.priority);
    setDueAt(t.due_at || "");
    setStatus(t.status);
  };

  const loadChecklist = async () => {
    if (!task) return;
    const { data } = await supabase.from("task_checklist_items").select("*").eq("task_id", task.id).order("sort_order");
    setChecklist((data as ChecklistItem[]) || []);
  };

  const loadAttachments = async () => {
    if (!task) return;
    const { data } = await supabase.from("task_attachments").select("*").eq("task_id", task.id).order("created_at");
    setAttachments((data as Attachment[]) || []);
  };

  const loadComments = async () => {
    if (!task) return;
    const { data } = await supabase.from("comments").select("*").eq("task_id", task.id).order("created_at");
    setComments((data as Comment[]) || []);
  };

  const loadActivity = async () => {
    if (!task) return;
    const { data } = await supabase.from("task_activity_log").select("*").eq("task_id", task.id).order("created_at", { ascending: false });
    setActivity((data as ActivityEntry[]) || []);
  };

  const handleSave = async () => {
    if (!task || !title.trim()) return;
    const isTeam = assigneeId === "__team__";
    const { error } = await supabase.from("tasks").update({
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      client_id: clientId || null,
      assigned_to_user_id: isTeam ? null : (assigneeId || null),
      assigned_to_team: isTeam,
      priority, due_at: dueAt || null, status,
    } as any).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task updated!");
    setEditing(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!task) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    onUpdated();
    onClose();
  };

  // Checklist
  const addCheckItem = async () => {
    if (!task || !newCheckItem.trim() || !profile) return;
    const { error } = await supabase.from("task_checklist_items").insert({
      task_id: task.id, title: newCheckItem.trim(),
      sort_order: checklist.length, created_by_user_id: profile.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    setNewCheckItem("");
    loadChecklist();
  };

  const toggleCheckItem = async (item: ChecklistItem) => {
    await supabase.from("task_checklist_items").update({ completed: !item.completed } as any).eq("id", item.id);
    loadChecklist();
  };

  const deleteCheckItem = async (id: string) => {
    await supabase.from("task_checklist_items").delete().eq("id", id);
    loadChecklist();
  };

  // Attachments
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !profile || !e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `tasks/${task.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("creative-assets").upload(path, file);
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
    await supabase.from("task_attachments").insert({
      task_id: task.id, file_url: urlData.publicUrl, file_name: file.name,
      file_type: file.type, uploaded_by_user_id: profile.id,
    } as any);
    setUploading(false);
    loadAttachments();
    toast.success("File uploaded");
  };

  const deleteAttachment = async (att: Attachment) => {
    await supabase.from("task_attachments").delete().eq("id", att.id);
    loadAttachments();
  };

  // Comments
  const addComment = async () => {
    if (!task || !newComment.trim() || !profile) return;
    const { error } = await supabase.from("comments").insert({
      task_id: task.id, body: newComment.trim(), user_id: profile.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    loadComments();
  };

  const userName = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u?.name || u?.email || "Unknown";
  };

  const completedCount = checklist.filter((c) => c.completed).length;
  const progressPct = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const actionLabel = (action: string) => {
    switch (action) {
      case "status_changed": return "Status changed";
      case "reassigned": return "Reassigned";
      case "priority_changed": return "Priority changed";
      default: return action;
    }
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || "—";
  const getAssigneeName = () => {
    if (assignToTeam) return "🤝 Team";
    if (assigneeId) return userName(assigneeId);
    return "Unassigned";
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => { if (!o) { setEditing(false); } !o && onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none" />
            ) : (
              <span>{title}</span>
            )}
            <Badge variant="outline" className={priorityColors[priority] || ""}>{priority}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Meta fields */}
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusColumns.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <DatePickerField value={dueAt} onChange={setDueAt} placeholder="Pick date" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <Select value={projectId || "__none__"} onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select value={assigneeId || "__none__"} onValueChange={(v) => { setAssigneeId(v === "__none__" ? "" : v); setAssignToTeam(v === "__team__"); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  <SelectItem value="__team__">🤝 Team</SelectItem>
                  {ssUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm font-medium">{statusLabels[status] || status}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <p className="text-sm font-medium capitalize">{priority}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <p className="text-sm font-medium">{dueAt ? format(new Date(dueAt), "PPP") : "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <p className="text-sm font-medium">{clientId ? "Assigned" : "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <p className="text-sm font-medium">{projectId ? getProjectName(projectId) : "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <p className="text-sm font-medium">{getAssigneeName()}</p>
            </div>
          </div>
        )}

        {/* Tabs — always interactive */}
        <Tabs defaultValue="description" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description" className="text-xs gap-1"><FileText className="h-3 w-3" /> Description</TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs gap-1"><ListChecks className="h-3 w-3" /> Checklist {checklist.length > 0 && `(${completedCount}/${checklist.length})`}</TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs gap-1"><Paperclip className="h-3 w-3" /> Files {attachments.length > 0 && `(${attachments.length})`}</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs gap-1"><MessageSquare className="h-3 w-3" /> Comments {comments.length > 0 && `(${comments.length})`}</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="h-3 w-3" /> Activity</TabsTrigger>
            {isSSRole && <TabsTrigger value="ai" className="text-xs gap-1"><Bot className="h-3 w-3" /> AI</TabsTrigger>}
            {isSSRole && <TabsTrigger value="strategy" className="text-xs gap-1"><Target className="h-3 w-3" /> Strategy</TabsTrigger>}
          </TabsList>

          {/* Description */}
          <TabsContent value="description">
            {editing ? (
              <Textarea
                placeholder="Add instructions or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            ) : (
              <div className="min-h-[60px] text-sm whitespace-pre-wrap text-muted-foreground">
                {description || "No description"}
              </div>
            )}
          </TabsContent>

          {/* Checklist */}
          <TabsContent value="checklist" className="space-y-3">
            {checklist.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedCount}/{checklist.length} complete</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            )}
            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group py-1">
                  <Checkbox checked={item.completed} onCheckedChange={() => toggleCheckItem(item)} />
                  <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteCheckItem(item.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add checklist item..." value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCheckItem()} className="h-8 text-sm" />
              <Button size="sm" onClick={addCheckItem} disabled={!newCheckItem.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          </TabsContent>

          {/* Attachments */}
          <TabsContent value="attachments" className="space-y-3">
            <input type="file" ref={fileRef} className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Paperclip className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload File"}
            </Button>
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 p-2 border rounded-md text-sm group">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{att.file_name}</span>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(att.file_url); toast.success("Link copied"); }}>
                    <Link2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteAttachment(att)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-xs text-muted-foreground">No attachments yet</p>}
            </div>
          </TabsContent>

          {/* Comments */}
          <TabsContent value="comments" className="space-y-3">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{userName(c.user_id)}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm">{c.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet</p>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()} className="h-8 text-sm" />
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()}><Send className="h-3 w-3" /></Button>
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="space-y-2">
            {activity.length === 0 && <p className="text-xs text-muted-foreground">No activity recorded yet</p>}
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs py-1 border-b last:border-b-0">
                <Activity className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{userName(a.user_id)}</span>{" "}
                  <span className="text-muted-foreground">{actionLabel(a.action)}</span>
                  {a.details && <span className="text-muted-foreground"> — {a.details}</span>}
                  <div className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}</div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between sm:justify-between">
          {canEdit && !editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
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
            </div>
          )}
          {editing ? (
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={() => { setEditing(false); if (task) resetFields(task); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim()}>Save</Button>
            </div>
          ) : (
            !canEdit && <Button variant="ghost" onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
