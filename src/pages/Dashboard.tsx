
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast } from "date-fns";
import {
  CheckSquare,
  MessageSquarePlus,
  FileEdit,
  Calendar,
  Clock,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  UserPlus,
  PenLine,
  Mic,
  Paperclip,
  Send,
  Square,
  X,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

const TASK_STATUSES = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  waiting: "Waiting", review: "Review", complete: "Complete",
};

// ─── Work Queue Dashboard (Admin + Team) ─────────────────────────────────────

function WorkQueueDashboard() {
  const { profile, isSSAdmin } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"my" | "team" | "all">("my");

  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_team", "ss_producer", "ss_ops"]);
      if (!roles?.length) return [];
      const ids = [...new Set(roles.map(r => r.user_id))];
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", ids);
      return users || [];
    },
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ["wq-tasks", profile?.id, filter, globalClientId],
    queryFn: async () => {
      let q = supabase.from("tasks")
        .select("id, title, status, priority, due_at, assigned_to_user_id, assigned_to_team, client_id, project_id, clients(name), projects(name)")
        .not("status", "eq", "complete")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(10);
      if (filter === "my") {
        q = q.or(`assigned_to_user_id.eq.${profile!.id},assigned_to_team.eq.true`);
      }
      if (globalClientId) q = q.eq("client_id", globalClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["wq-requests", profile?.id, filter, globalClientId],
    queryFn: async () => {
      let q = supabase.from("requests")
        .select("id, topic, type, priority, status, created_at, assigned_to_user_id, client_id, created_by_user_id, clients(name), users!requests_created_by_user_id_fkey(name)")
        .not("status", "eq", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (filter === "my") {
        q = q.eq("assigned_to_user_id", profile!.id);
      }
      if (globalClientId) q = q.eq("client_id", globalClientId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: approvalsWaiting = [] } = useQuery({
    queryKey: ["wq-approvals"],
    queryFn: async () => {
      const { data } = await supabase.from("posts")
        .select("id, title, content_type, created_at, status_column, client_id, clients(name)")
        .in("status_column", ["internal_review", "client_approval"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: overdueItems = [] } = useQuery({
    queryKey: ["wq-overdue", profile?.id, filter, globalClientId],
    queryFn: async () => {
      const now = new Date().toISOString();
      let tq = supabase.from("tasks")
        .select("id, title, due_at, status, priority, client_id, assigned_to_user_id, clients(name)")
        .lt("due_at", now)
        .not("status", "eq", "complete")
        .order("due_at", { ascending: true })
        .limit(10);
      if (filter === "my") {
        tq = tq.or(`assigned_to_user_id.eq.${profile!.id},assigned_to_team.eq.true`);
      }
      if (globalClientId) tq = tq.eq("client_id", globalClientId);
      let pq = supabase.from("posts")
        .select("id, title, due_at, status_column, client_id, assigned_to_user_id, clients(name)")
        .lt("due_at", now)
        .not("status_column", "eq", "published")
        .order("due_at", { ascending: true })
        .limit(10);
      if (filter === "my") {
        pq = pq.eq("assigned_to_user_id", profile!.id);
      }
      if (globalClientId) pq = pq.eq("client_id", globalClientId);
      const [{ data: tasks }, { data: posts }] = await Promise.all([tq, pq]);
      const items: any[] = [];
      (tasks || []).forEach(t => items.push({ ...t, _type: "task", _status: t.status }));
      (posts || []).forEach(p => items.push({ ...p, _type: "post", _status: p.status_column }));
      items.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
      return items;
    },
    enabled: !!profile,
  });

  const taskCount = myTasks.length;
  const requestCount = myRequests.length;
  const approvalCount = approvalsWaiting.length;
  const overdueCount = overdueItems.length;

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["wq-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["wq-overdue"] });
  };

  const updateTaskAssignee = async (taskId: string, userId: string) => {
    await supabase.from("tasks").update({ assigned_to_user_id: userId }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["wq-tasks"] });
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    await supabase.from("requests").update({ status: status as any }).eq("id", requestId);
    queryClient.invalidateQueries({ queryKey: ["wq-requests"] });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Work Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.name ? `Welcome back, ${profile.name.split(" ")[0]}` : "Your workspace"}
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="my">My Work</TabsTrigger>
            <TabsTrigger value="team">Team Work</TabsTrigger>
            {isSSAdmin && <TabsTrigger value="all">All Work</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="My Tasks"
          value={taskCount}
          icon={<ClipboardList className="h-4 w-4" />}
          onClick={() => navigate("/team/tasks")}
        />
        <StatCard
          label="My Requests"
          value={requestCount}
          icon={<MessageSquarePlus className="h-4 w-4" />}
          onClick={() => navigate("/requests")}
        />
        <StatCard
          label="Approvals"
          value={approvalCount}
          icon={<CheckSquare className="h-4 w-4" />}
          onClick={() => navigate("/approvals")}
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="destructive"
          onClick={() => navigate("/team/tasks?filter=overdue")}
        />
      </div>

      {/* My Tasks Section */}
      <div>
        <SectionHeader
          title="My Tasks"
          icon={<ClipboardList className="h-5 w-5" />}
          action="View all"
          onAction={() => navigate("/team/tasks")}
        />
        {myTasks.length === 0 ? (
          <EmptyState title="No outstanding tasks 🎉" compact />
        ) : (
          <div className="space-y-1">
            {myTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => navigate("/team/tasks")}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                  {task.clients?.name && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{task.clients.name}</span>}
                  {task.due_at && (
                    <span className={`text-xs shrink-0 ${isPast(new Date(task.due_at)) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {format(new Date(task.due_at), "MMM d")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Badge variant="outline" className="text-[11px] capitalize">{task.priority}</Badge>
                  <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[100px] border-border/50 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{TASK_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Mark Complete" onClick={() => updateTaskStatus(task.id, "complete")}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Select value={task.assigned_to_user_id || ""} onValueChange={(v) => updateTaskAssignee(task.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-7 border-none bg-transparent p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Assign">
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {ssUsers.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Requests Section */}
      <div>
        <SectionHeader
          title="My Requests"
          icon={<MessageSquarePlus className="h-5 w-5" />}
          action="View all"
          onAction={() => navigate("/requests")}
        />
        {myRequests.length === 0 ? (
          <EmptyState title="No assigned requests" compact />
        ) : (
          <div className="space-y-1">
            {myRequests.map((req: any) => (
              <div
                key={req.id}
                className="flex items-center justify-between px-4 py-3.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate("/requests")}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">{req.topic}</span>
                  {req.clients?.name && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{req.clients.name}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(req.created_at), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Badge variant="outline" className="text-[11px] capitalize">{req.priority}</Badge>
                  <Select value={req.status} onValueChange={(v) => updateRequestStatus(req.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[100px] border-border/50 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open" className="text-xs">Open</SelectItem>
                      <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                      <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client Dashboard ────────────────────────────────────────────────────────

function ClientDashboard() {
  const { profile, isClientAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["client-pending-approvals", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "client_approval").eq("client_id", profile.client_id);
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: openRequests = 0 } = useQuery({
    queryKey: ["client-open-requests", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "open").eq("client_id", profile.client_id);
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: clientData } = useQuery({
    queryKey: ["client-plan-and-addons", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase.from("clients").select("name, plans(name, includes_json), whats_new_visible_addons, recommended_item_id").eq("id", profile.client_id).single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const { data: marketplaceItems = [] } = useQuery({
    queryKey: ["client-marketplace-items"],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_items").select("*").eq("is_active", true).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: sentCampaigns = 0 } = useQuery({
    queryKey: ["client-sent-campaigns", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return 0;
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("status_column", "sent").eq("client_id", profile.client_id).eq("content_type", "email_campaign");
      return count || 0;
    },
    enabled: !!profile?.client_id,
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["client-scheduled-posts", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data } = await supabase.from("posts").select("id, title, platform, scheduled_at").eq("client_id", profile.client_id).gt("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(5);
      return data || [];
    },
    enabled: !!profile?.client_id,
  });

  const recommendedItem = (clientData as any)?.recommended_item_id
    ? marketplaceItems.find((i: any) => i.id === (clientData as any).recommended_item_id)
    : marketplaceItems[0] || null;
  const newestItem = marketplaceItems.find((i: any) => i.id !== recommendedItem?.id) || null;

  const queryClient = useQueryClient();
  const [captureInput, setCaptureInput] = useState("");
  const [captureExpanded, setCaptureExpanded] = useState(false);
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureRecording, setCaptureRecording] = useState(false);
  const [captureTranscribing, setCaptureTranscribing] = useState(false);
  const captureMediaRef = useRef<MediaRecorder | null>(null);
  const captureChunksRef = useRef<Blob[]>([]);
  const captureFileRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: recentCaptures = [] } = useQuery({
    queryKey: ["client-recent-captures", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return [];
      const { data } = await supabase
        .from("brain_captures" as any)
        .select("*")
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []) as unknown as Array<{ id: string; type: string; content: string; created_at: string }>;
    },
    enabled: !!profile?.client_id,
  });

  const saveCaptureNote = async () => {
    if (!captureInput.trim() || !profile?.client_id) return;
    setCaptureSaving(true);
    const { error } = await supabase.from("brain_captures" as any).insert({
      client_id: profile.client_id,
      created_by_user_id: profile.id,
      type: "note",
      content: captureInput.trim(),
    });
    setCaptureSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Captured!");
    setCaptureInput("");
    setCaptureExpanded(false);
    queryClient.invalidateQueries({ queryKey: ["client-recent-captures"] });
    queryClient.invalidateQueries({ queryKey: ["brain-captures"] });
  };

  const startCaptureRecording = useCallback(async () => {
    if (!profile?.client_id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      captureChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) captureChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(captureChunksRef.current, { type: "audio/webm" });
        const path = `captures/${profile.client_id}/${Date.now()}-voice.webm`;
        const { error } = await supabase.storage.from("creative-assets").upload(path, blob);
        if (error) { toast.error("Upload failed"); return; }
        const url = supabase.storage.from("creative-assets").getPublicUrl(path).data.publicUrl;
        setCaptureTranscribing(true);
        let transcript = "";
        try {
          const { data } = await supabase.functions.invoke("transcribe-capture", { body: { audioUrl: url } });
          transcript = data?.transcript || "";
        } catch {}
        setCaptureTranscribing(false);
        const { error: insertErr } = await supabase.from("brain_captures" as any).insert({
          client_id: profile.client_id,
          created_by_user_id: profile.id,
          type: "voice",
          content: transcript || "Voice note",
          attachment_url: url,
          attachment_name: "voice.webm",
          voice_transcript: transcript,
        });
        if (!insertErr) {
          toast.success("Voice captured!");
          queryClient.invalidateQueries({ queryKey: ["client-recent-captures"] });
        }
      };
      captureMediaRef.current = mr;
      mr.start();
      setCaptureRecording(true);
    } catch { toast.error("Microphone access denied"); }
  }, [profile?.client_id, profile?.id, queryClient]);

  const stopCaptureRecording = useCallback(() => {
    captureMediaRef.current?.stop();
    setCaptureRecording(false);
  }, []);

  const handleCaptureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !profile?.client_id) return;
    setCaptureSaving(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} too large`); continue; }
      let uploadFile: File | Blob = file;
      if (file.type.startsWith("image/")) uploadFile = await compressImage(file);
      const path = `captures/${profile.client_id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("creative-assets").upload(path, uploadFile);
      if (error) continue;
      const url = supabase.storage.from("creative-assets").getPublicUrl(path).data.publicUrl;
      await supabase.from("brain_captures" as any).insert({
        client_id: profile.client_id, created_by_user_id: profile.id,
        type: "file", content: file.name, attachment_url: url, attachment_name: file.name,
      });
    }
    setCaptureSaving(false);
    toast.success("File captured!");
    queryClient.invalidateQueries({ queryKey: ["client-recent-captures"] });
    if (captureFileRef.current) captureFileRef.current.value = "";
  };

  const TYPE_EMOJI: Record<string, string> = { note: "📝", voice: "🎤", link: "🔗", file: "📄" };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your marketing.</p>
      </div>

      {/* ─── Capture Widget ─── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <p className="text-sm font-medium text-foreground">💡 What's on your mind?</p>
        {!captureExpanded ? (
          <button
            onClick={() => { setCaptureExpanded(true); setTimeout(() => captureInputRef.current?.focus(), 100); }}
            className="w-full text-left text-sm text-muted-foreground bg-secondary/50 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
          >
            Tap to capture an idea, link, or thought...
          </button>
        ) : (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <Textarea
              ref={captureInputRef}
              value={captureInput}
              onChange={(e) => setCaptureInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveCaptureNote(); } }}
              placeholder="What's on your mind?"
              className="min-h-[80px] text-sm resize-none rounded-xl bg-background"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={captureRecording ? stopCaptureRecording : startCaptureRecording}>
                  {captureRecording ? <Square className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => captureFileRef.current?.click()}>
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="rounded-full text-xs" onClick={() => { setCaptureExpanded(false); setCaptureInput(""); }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" className="rounded-full text-xs" onClick={saveCaptureNote} disabled={!captureInput.trim() || captureSaving}>
                  {captureSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Capture</>}
                </Button>
              </div>
            </div>
          </div>
        )}
        {captureTranscribing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Transcribing voice...
          </div>
        )}
        {recentCaptures.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-muted-foreground font-medium">Recent captures</p>
            {recentCaptures.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                <span className="text-xs">{TYPE_EMOJI[c.type] || "📝"}</span>
                <span className="truncate text-foreground text-xs">{c.content || "Untitled"}</span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{format(new Date(c.created_at), "MMM d")}</span>
              </div>
            ))}
          </div>
        )}
        <input ref={captureFileRef} type="file" multiple className="hidden" onChange={handleCaptureFile} />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto py-5 flex flex-col items-start gap-1.5 border-border/40 hover:border-primary/30 hover:shadow-sm transition-all" onClick={() => navigate("/requests?type=social_post")}>
            <FileEdit className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Request a Social Post</span>
          </Button>
          <Button variant="outline" className="h-auto py-5 flex flex-col items-start gap-1.5 border-border/40 hover:border-primary/30 hover:shadow-sm transition-all" onClick={() => navigate("/requests?type=email_campaign")}>
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Request an Email Campaign</span>
          </Button>
          <Button variant="outline" className="h-auto py-5 flex flex-col items-start gap-1.5 border-border/40 hover:border-primary/30 hover:shadow-sm transition-all" onClick={() => navigate("/approvals")}>
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Review Content</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Awaiting Approval"
          value={pendingApprovals}
          subtitle="Content ready for review"
          icon={<CheckSquare className="h-4 w-4" />}
          onClick={() => navigate("/approvals")}
        />
        <StatCard
          label="Open Requests"
          value={openRequests}
          subtitle="Requests being worked on"
          icon={<MessageSquarePlus className="h-4 w-4" />}
          onClick={() => navigate("/requests")}
        />
        <StatCard
          label="Sent Campaigns"
          value={sentCampaigns}
          subtitle="Email campaigns sent"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => navigate("/approvals")}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivitySection clientId={profile?.client_id} />

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div>
          <SectionHeader title="Next Scheduled Posts" icon={<Calendar className="h-5 w-5" />} />
          <div className="space-y-1">
            {scheduledPosts.map((post: any) => (
              <div key={post.id} className="flex items-center justify-between px-4 py-3.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/approvals/${post.id}`)}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground min-w-[70px]">{format(new Date(post.scheduled_at), "MMM d")}</span>
                  <span className="text-sm font-medium text-foreground">{post.title}</span>
                </div>
                {post.platform && <Badge variant="secondary" className="text-[11px]">{post.platform.split(",")[0].trim()}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Plan */}
      {clientData && (
        <div
          className="card-elevated p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate("/plan")}
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Plan</p>
            <p className="font-semibold text-foreground mt-1">{(clientData as any).plans?.name || "No plan assigned"}</p>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>
      )}

      {/* Recommended */}
      {(recommendedItem || newestItem) && (
        <div>
          <SectionHeader title="Recommended for You" icon={<Sparkles className="h-5 w-5 text-warning" />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendedItem && (
              <div className="card-elevated p-5 space-y-3 cursor-pointer hover:shadow-md transition-all ring-1 ring-primary/10" onClick={() => navigate("/whats-new")}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{(recommendedItem as any).icon || "⭐"}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px]">Recommended</Badge>
                </div>
                <h4 className="font-semibold text-foreground text-sm">{(recommendedItem as any).name}</h4>
                {(recommendedItem as any).description && <p className="text-xs text-muted-foreground line-clamp-2">{(recommendedItem as any).description}</p>}
                {(recommendedItem as any).price && <p className="text-xs font-medium text-primary">{(recommendedItem as any).price}</p>}
                <Button size="sm" variant="default" className="mt-1">Learn More</Button>
              </div>
            )}
            {newestItem && (
              <div className="card-elevated p-5 space-y-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/whats-new")}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{(newestItem as any).icon || "🆕"}</span>
                  <Badge variant="outline" className="text-[11px]">New</Badge>
                </div>
                <h4 className="font-semibold text-foreground text-sm">{(newestItem as any).name}</h4>
                {(newestItem as any).description && <p className="text-xs text-muted-foreground line-clamp-2">{(newestItem as any).description}</p>}
                {(newestItem as any).price && <p className="text-xs font-medium text-primary">{(newestItem as any).price}</p>}
                <Button size="sm" variant="outline" className="mt-1">Learn More</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recent Activity Section ─────────────────────────────────────────────────

function RecentActivitySection({ clientId }: { clientId: string | null | undefined }) {
  const [limit, setLimit] = useState(10);

  const { data: activities = [] } = useQuery({
    queryKey: ["client-activity-dashboard", clientId, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_activity")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data || []) as Array<{
        id: string;
        activity_type: string;
        title: string;
        description: string | null;
        created_at: string;
        visible_to_client: boolean;
      }>;
    },
    enabled: !!clientId,
  });

  if (!clientId || activities.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Recent Activity" icon={<Activity className="h-5 w-5" />} />
      <ActivityTimeline
        activities={activities}
        isSSRole={false}
        hasMore={activities.length === limit}
        onLoadMore={() => setLimit((l) => l + 10)}
      />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isSSRole, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  return isSSRole ? <WorkQueueDashboard /> : <ClientDashboard />;
}
