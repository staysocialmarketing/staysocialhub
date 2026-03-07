import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ListTodo, MessageSquarePlus, Lightbulb, ImagePlus, Mic, ArrowLeft, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import { compressImage } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

type CaptureMode = null | "task" | "idea" | "image" | "voice";

export function GlobalCaptureButton() {
  const { isSSRole, isClientAdmin, isClientAssistant, profile } = useAuth();
  const isClient = isClientAdmin || isClientAssistant;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClient, setTaskClient] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskAssign, setTaskAssign] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  // Idea form
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");
  const [ideaType, setIdeaType] = useState("idea");
  const [ideaClient, setIdeaClient] = useState("");
  const [ideaFile, setIdeaFile] = useState<File | null>(null);

  // Image upload
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgClient, setImgClient] = useState("");

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [voiceClient, setVoiceClient] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // SS users for assignment
  const [ssUsers, setSsUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const resetAll = () => {
    setMode(null);
    setTaskTitle(""); setTaskClient(""); setTaskProject(""); setTaskPriority("normal");
    setTaskAssign(""); setTaskDue(""); setTaskDesc("");
    setIdeaTitle(""); setIdeaDesc(""); setIdeaType("idea"); setIdeaClient(""); setIdeaFile(null);
    setImgFile(null); setImgClient("");
    setAudioBlob(null); setVoiceClient("");
    setIsRecording(false);
    setSaving(false);
  };

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && isSSRole) {
      // Only load SS users and projects for SS roles
      const [usersRes, projectsRes] = await Promise.all([
        supabase.from("users").select("id, name").in("id",
          (await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_team", "ss_producer", "ss_ops"])).data?.map(r => r.user_id) || []
        ),
        supabase.from("projects").select("id, name").eq("status", "active").order("name"),
      ]);
      setSsUsers(usersRes.data?.map(u => ({ id: u.id, name: u.name || "Unnamed" })) || []);
      setProjects(projectsRes.data?.map(p => ({ id: p.id, name: p.name })) || []);
    } else if (!isOpen) {
      resetAll();
    }
  };

  // --- Task ---
  const saveTask = async () => {
    if (!taskTitle.trim() || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: taskTitle.trim(),
      client_id: taskClient || null,
      project_id: taskProject || null,
      priority: taskPriority,
      assigned_to_user_id: taskAssign || null,
      due_at: taskDue || null,
      description: taskDesc || null,
      created_by_user_id: profile.id,
      status: "todo",
      source_type: "capture",
      raw_input_text: [taskTitle.trim(), taskDesc].filter(Boolean).join("\n"),
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to create task"); return; }
    toast.success("Task created");
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    handleOpen(false);
  };

  // --- Idea ---
  const saveIdea = async () => {
    if (!ideaTitle.trim() || !profile) return;
    setSaving(true);
    let imageUrl: string | null = null;
    if (ideaFile) {
      const compressed = await compressImage(ideaFile);
      const path = `ideas/${Date.now()}-${compressed.name}`;
      const { error: upErr } = await supabase.storage.from("creative-assets").upload(path, compressed);
      if (!upErr) {
        imageUrl = supabase.storage.from("creative-assets").getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase.from("think_tank_items").insert({
      title: ideaTitle.trim(),
      body: [ideaDesc, imageUrl ? `\n![image](${imageUrl})` : ""].join(""),
      type: ideaType,
      client_id: ideaClient || null,
      created_by_user_id: profile.id,
    });
    setSaving(false);
    if (error) { toast.error("Failed to capture idea"); return; }
    toast.success("Idea captured");
    queryClient.invalidateQueries({ queryKey: ["think-tank"] });
    handleOpen(false);
  };

  // --- Image Upload ---
  const saveImage = async () => {
    if (!imgFile || !profile) return;
    setSaving(true);
    const compressed = await compressImage(imgFile);
    const folder = isClient ? (profile.client_id || "general") : (imgClient || "general");
    const path = `${folder}/${Date.now()}-${compressed.name}`;
    const { error } = await supabase.storage.from("creative-assets").upload(path, compressed);
    setSaving(false);
    if (error) { toast.error("Upload failed"); return; }
    toast.success("Image uploaded to Media Library");
    handleOpen(false);
  };

  // --- Voice Recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const saveVoiceNote = async () => {
    if (!audioBlob || !profile) return;
    setSaving(true);
    const folder = isClient ? (profile.client_id || "general") : (voiceClient || "general");
    const path = `${folder}/voice-notes/voice-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("creative-assets").upload(path, audioBlob, { contentType: "audio/webm" });
    setSaving(false);
    if (error) { toast.error("Upload failed"); return; }
    toast.success("Voice note saved");
    handleOpen(false);
  };

  if (!isSSRole && !isClient) return null;

  const allOptions = [
    { key: "task" as const, icon: ListTodo, label: "Create Task", desc: "Quick task creation", ssOnly: true },
    { key: "request" as const, icon: MessageSquarePlus, label: "Create Request", desc: "New client request", ssOnly: false },
    { key: "idea" as const, icon: Lightbulb, label: "Capture Idea", desc: "Save to Think Tank", ssOnly: true },
    { key: "image" as const, icon: ImagePlus, label: "Upload Image", desc: "Add to Media Library", ssOnly: false },
    { key: "voice" as const, icon: Mic, label: "Voice Note", desc: "Record audio", ssOnly: false },
  ];
  const options = allOptions.filter(o => isSSRole || !o.ssOnly);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => handleOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label="Quick capture"
      >
        <Plus className={cn("h-6 w-6 transition-transform", open && "rotate-45")} />
      </button>

      {/* Capture Dialog */}
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode && (
                <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {mode === null ? "Quick Capture" : options.find(o => o.key === mode)?.label}
            </DialogTitle>
          </DialogHeader>

          {/* Option Grid */}
          {mode === null && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "request") {
                      setOpen(false);
                      setTimeout(() => setRequestOpen(true), 200);
                    } else {
                      setMode(opt.key);
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-accent transition-colors text-center"
                >
                  <opt.icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Create Task Form */}
          {mode === "task" && (
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" /></div>
              <div><Label>Client</Label><ClientSelectWithCreate value={taskClient} onValueChange={setTaskClient} /></div>
              <div>
                <Label>Project</Label>
                <Select value={taskProject} onValueChange={setTaskProject}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
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
                  <Label>Assign To</Label>
                  <Select value={taskAssign} onValueChange={setTaskAssign}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {ssUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Due Date</Label><DatePickerField value={taskDue} onChange={setTaskDue} /></div>
              <div><Label>Description</Label><Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Optional description" rows={3} /></div>
              <Button onClick={saveTask} disabled={!taskTitle.trim() || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
              </Button>
            </div>
          )}

          {/* Capture Idea Form */}
          {mode === "idea" && (
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="Idea title" /></div>
              <div><Label>Description</Label><Textarea value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)} placeholder="Describe the idea" rows={3} /></div>
              <div>
                <Label>Type</Label>
                <Select value={ideaType} onValueChange={setIdeaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="brainstorm">Brainstorm</SelectItem>
                    <SelectItem value="meeting_note">Meeting Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Client</Label><ClientSelectWithCreate value={ideaClient} onValueChange={setIdeaClient} /></div>
              <div>
                <Label>Image (optional)</Label>
                <Input type="file" accept="image/*" onChange={e => setIdeaFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={saveIdea} disabled={!ideaTitle.trim() || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Capture Idea"}
              </Button>
            </div>
          )}

          {/* Upload Image Form */}
          {mode === "image" && (
            <div className="space-y-3">
              <div>
                <Label>Image *</Label>
                <Input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] || null)} />
              </div>
              {isSSRole && <div><Label>Client</Label><ClientSelectWithCreate value={imgClient} onValueChange={setImgClient} /></div>}
              {imgFile && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={URL.createObjectURL(imgFile)} alt="Preview" className="max-h-48 w-full object-contain bg-muted" />
                </div>
              )}
              <Button onClick={saveImage} disabled={!imgFile || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Image"}
              </Button>
            </div>
          )}

          {/* Voice Note Form */}
          {mode === "voice" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-4">
                {!audioBlob && !isRecording && (
                  <Button onClick={startRecording} variant="outline" className="h-20 w-20 rounded-full">
                    <Mic className="h-8 w-8 text-primary" />
                  </Button>
                )}
                {isRecording && (
                  <Button onClick={stopRecording} variant="destructive" className="h-20 w-20 rounded-full animate-pulse">
                    <Square className="h-6 w-6" />
                  </Button>
                )}
                {audioBlob && (
                  <div className="w-full space-y-2">
                    <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                    <Button variant="ghost" size="sm" onClick={() => { setAudioBlob(null); }} className="text-xs">
                      Re-record
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {isRecording ? "Recording... tap to stop" : audioBlob ? "Voice note ready" : "Tap to start recording"}
                </p>
              </div>
              {isSSRole && <div><Label>Client</Label><ClientSelectWithCreate value={voiceClient} onValueChange={setVoiceClient} /></div>}
              <Button onClick={saveVoiceNote} disabled={!audioBlob || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Voice Note"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reuse existing MakeRequestDialog */}
      <MakeRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </>
  );
}
