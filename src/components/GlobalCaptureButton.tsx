import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConversation } from "@elevenlabs/react";
import {
  Plus, PenLine, Mic, Link2, Paperclip, ListTodo, MessageSquarePlus,
  Send, Square, X, ArrowLeft, Loader2, Sparkles, Phone, PhoneOff,
  Check, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ClientSelectWithCreate from "@/components/ClientSelectWithCreate";
import DatePickerField from "@/components/DatePickerField";
import MakeRequestDialog from "@/components/MakeRequestDialog";
import { compressImage } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";

type CaptureMode = null | "note" | "voice" | "link" | "file" | "task" | "request" | "assistant";

type ChatMsg = { role: "user" | "assistant"; content: string };

type ProposedAction = {
  tool: string;
  args: Record<string, any>;
  summary: string;
};

const ACTION_CONFIG = {
  note: { label: "Pin a Thought", icon: PenLine, bg: "bg-primary/10", text: "text-primary", desc: "Jot down an idea" },
  voice: { label: "Record Voice", icon: Mic, bg: "bg-destructive/10", text: "text-destructive", desc: "Speak your mind" },
  link: { label: "Add Link", icon: Link2, bg: "bg-blue-500/10", text: "text-blue-500", desc: "Save a reference" },
  file: { label: "Upload File", icon: Paperclip, bg: "bg-green-500/10", text: "text-green-500", desc: "Attach a document" },
  task: { label: "Create Task", icon: ListTodo, bg: "bg-amber-500/10", text: "text-amber-500", desc: "Add to your queue" },
  request: { label: "Make Request", icon: MessageSquarePlus, bg: "bg-purple-500/10", text: "text-purple-500", desc: "New client request" },
  assistant: { label: "Hub Assistant", icon: Sparkles, bg: "bg-gradient-to-br from-primary/10 to-primary/5", text: "text-primary", desc: "Ask me anything" },
} as const;

// Sub-mode within assistant
type AssistantView = "chat" | "voice-call" | "confirm";

export function GlobalCaptureButton() {
  const { isSSRole, isClientAdmin, isClientAssistant, profile } = useAuth();
  const isClient = isClientAdmin || isClientAssistant;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Shared capture state
  const [input, setInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [clientId, setClientId] = useState("");

  // Voice
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // File
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskAssign, setTaskAssign] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  // SS data
  const [ssUsers, setSsUsers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Assistant chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Assistant sub-mode (text chat, voice call, confirmation)
  const [assistantView, setAssistantView] = useState<AssistantView>("chat");

  // Voice call state
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const voiceTranscriptRef = useRef<string[]>([]);

  // Confirmation card state
  const [proposedActions, setProposedActions] = useState<ProposedAction[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  // Idle auto-end timer
  const lastMessageTimeRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onMessage: (message: any) => {
      lastMessageTimeRef.current = Date.now();
      if (message.type === "user_transcript" && message.user_transcription_event?.user_transcript) {
        voiceTranscriptRef.current.push(`User: ${message.user_transcription_event.user_transcript}`);
      }
      if (message.type === "agent_response" && message.agent_response_event?.agent_response) {
        voiceTranscriptRef.current.push(`Assistant: ${message.agent_response_event.agent_response}`);
      }
    },
    onError: (error: any) => {
      console.error("Voice agent error:", error);
      toast.error("Voice connection error");
    },
    onDisconnect: () => {
      // Clear idle timer
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      // When call ends naturally or disconnects, process transcript
      if (voiceTranscriptRef.current.length > 0 && assistantView === "voice-call") {
        handleVoiceCallEnd();
      }
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Focus chat input when entering assistant mode
  useEffect(() => {
    if (mode === "assistant" && assistantView === "chat" && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 300);
    }
  }, [mode, assistantView]);

  const resetAll = () => {
    setMode(null);
    setInput(""); setLinkInput(""); setClientId("");
    setTaskTitle(""); setTaskProject(""); setTaskPriority("normal");
    setTaskAssign(""); setTaskDue(""); setTaskDesc("");
    setRecording(false); setTranscribing(false);
    setSaving(false);
    setChatMessages([]); setChatInput(""); setChatLoading(false);
    setAssistantView("chat");
    setProposedActions([]); setExtracting(false); setExecuting(false);
    voiceTranscriptRef.current = [];
  };

  const handleOpen = async (isOpen: boolean) => {
    // Block closing during processing
    if (!isOpen && (extracting || executing)) {
      toast("Please wait — your request is still being processed", { icon: "⏳" });
      return;
    }
    setOpen(isOpen);
    if (isOpen && isSSRole) {
      const [usersRes, projectsRes] = await Promise.all([
        supabase.from("users").select("id, name").in("id",
          (await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_team", "ss_producer", "ss_ops"])).data?.map(r => r.user_id) || []
        ),
        supabase.from("projects").select("id, name").eq("status", "active").order("name"),
      ]);
      setSsUsers(usersRes.data?.map(u => ({ id: u.id, name: u.name || "Unnamed" })) || []);
      setProjects(projectsRes.data?.map(p => ({ id: p.id, name: p.name })) || []);
    } else if (!isOpen) {
      // End voice call if active
      if (conversation.status === "connected") {
        try { await conversation.endSession(); } catch {}
      }
      // Clear idle timer
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      resetAll();
    }
  };

  const getClientId = () => {
    if (isClient) return profile?.client_id || "";
    return clientId;
  };

  // ─── Save to brain_captures ───
  const saveToBrain = async (payload: Record<string, any>) => {
    const cid = getClientId();
    if (!cid || !profile) return false;
    const { error } = await supabase.from("brain_captures" as any).insert({
      client_id: cid,
      created_by_user_id: profile.id,
      ...payload,
    });
    if (error) { toast.error("Failed to save capture"); return false; }
    queryClient.invalidateQueries({ queryKey: ["brain-captures", cid] });
    queryClient.invalidateQueries({ queryKey: ["client-recent-captures"] });
    return true;
  };

  // ─── Note ───
  const handleNoteSubmit = async () => {
    if (!input.trim()) return;
    setSaving(true);
    const ok = await saveToBrain({ type: "note", content: input.trim() });
    setSaving(false);
    if (ok) { toast.success("Captured!"); handleOpen(false); }
  };

  // ─── Link ───
  const handleLinkSubmit = async () => {
    if (!linkInput.trim()) return;
    setSaving(true);
    const ok = await saveToBrain({ type: "link", content: linkInput.trim(), link_url: linkInput.trim() });
    setSaving(false);
    if (ok) { toast.success("Link captured!"); handleOpen(false); }
  };

  // ─── File ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !profile) return;
    const cid = getClientId();
    if (!cid) { toast.error("Please select a client"); return; }
    setSaving(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB`); continue; }
      let uploadFile: File | Blob = file;
      if (file.type.startsWith("image/")) {
        uploadFile = await compressImage(file);
      }
      const path = `captures/${cid}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("creative-assets").upload(path, uploadFile);
      if (error) { toast.error(`Upload failed: ${file.name}`); continue; }
      const url = supabase.storage.from("creative-assets").getPublicUrl(path).data.publicUrl;
      await saveToBrain({ type: "file", content: file.name, attachment_url: url, attachment_name: file.name });
    }
    setSaving(false);
    toast.success("File captured!");
    handleOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Voice ───
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const cid = getClientId();
        if (!cid) { toast.error("Please select a client"); return; }
        const path = `captures/${cid}/${Date.now()}-voice.webm`;
        const { error } = await supabase.storage.from("creative-assets").upload(path, blob);
        if (error) { toast.error("Upload failed"); return; }
        const url = supabase.storage.from("creative-assets").getPublicUrl(path).data.publicUrl;
        setTranscribing(true);
        let transcript = "";
        try {
          const { data, error: fnError } = await supabase.functions.invoke("transcribe-capture", { body: { audioUrl: url } });
          if (fnError) throw fnError;
          transcript = data?.transcript || "";
        } catch { console.error("Transcription failed"); }
        setTranscribing(false);
        setSaving(true);
        const ok = await saveToBrain({ type: "voice", content: transcript || "Voice note", attachment_url: url, attachment_name: "voice.webm", voice_transcript: transcript });
        setSaving(false);
        if (ok) { toast.success("Voice captured!"); handleOpen(false); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [clientId, profile]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  // ─── Task ───
  const saveTask = async () => {
    if (!taskTitle.trim() || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: taskTitle.trim(),
      client_id: getClientId() || null,
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

  // ─── Assistant Chat ───
  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    if (trimmed.length > 2000) {
      toast.error("Message too long (max 2000 characters)");
      return;
    }

    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to use the assistant");
        setChatLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            current_route: location.pathname,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || "Something went wrong";
        if (resp.status === 429) {
          toast.error("Rate limited — please try again in a moment");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted");
        } else {
          toast.error(errMsg);
        }
        setChatLoading(false);
        return;
      }

      const data = await resp.json();
      const assistantContent = data.response || "I'm not sure how to help with that.";
      setChatMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (err) {
      console.error("Hub assistant error:", err);
      toast.error("Failed to reach assistant");
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // ─── Voice Call (ElevenLabs) ───
  const startVoiceCall = useCallback(async () => {
    setVoiceConnecting(true);
    voiceTranscriptRef.current = [];

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        setVoiceConnecting(false);
        return;
      }

      // Combined call: get signed URL + prompt in one request
      const tokenResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            include_prompt: true,
            current_route: location.pathname,
          }),
        }
      );

      if (!tokenResp.ok) {
        throw new Error("Failed to get voice token");
      }

      const { signed_url, prompt: voicePrompt, first_message } = await tokenResp.json();
      if (!signed_url) throw new Error("No signed URL received");

      setAssistantView("voice-call");

      // Start idle auto-end timer (15s of no messages)
      lastMessageTimeRef.current = Date.now();
      idleTimerRef.current = setInterval(() => {
        if (conversation.status === "connected" && Date.now() - lastMessageTimeRef.current > 15000) {
          console.log("Idle timeout — auto-ending voice call");
          if (idleTimerRef.current) {
            clearInterval(idleTimerRef.current);
            idleTimerRef.current = null;
          }
          conversation.endSession().catch(() => {});
        }
      }, 3000);

      await conversation.startSession({
        signedUrl: signed_url,
        overrides: {
          agent: {
            prompt: {
              prompt: voicePrompt || "You are the Hub Assistant. Have a natural conversation to understand what the user needs.",
            },
            firstMessage: first_message || "Hey! I'm your Hub Assistant. What can I help you with today?",
          },
        },
      });
    } catch (err) {
      console.error("Voice call failed:", err);
      toast.error("Failed to start voice call. Please check microphone access.");
      setAssistantView("chat");
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    } finally {
      setVoiceConnecting(false);
    }
  }, [conversation, location.pathname]);

  const endVoiceCall = useCallback(async () => {
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    try {
      await conversation.endSession();
    } catch {}
    // onDisconnect callback will trigger handleVoiceCallEnd
  }, [conversation]);

  const handleVoiceCallEnd = useCallback(async () => {
    const transcript = voiceTranscriptRef.current.join("\n");
    voiceTranscriptRef.current = [];

    if (!transcript.trim()) {
      toast("No conversation detected");
      setAssistantView("chat");
      return;
    }

    // Extract actions from transcript
    setExtracting(true);
    setProcessingStep("Analyzing your conversation...");
    const extractionStart = Date.now();
    setAssistantView("confirm");

    // Update processing step with elapsed time
    const stepTimer = setInterval(() => {
      const elapsed = Math.round((Date.now() - extractionStart) / 1000);
      if (elapsed < 5) {
        setProcessingStep("Analyzing your conversation...");
      } else if (elapsed < 10) {
        setProcessingStep(`Extracting actions... (${elapsed}s)`);
      } else {
        setProcessingStep(`Almost done... (${elapsed}s)`);
      }
    }, 1000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setProcessingStep("Extracting actions...");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: "extract_actions", transcript }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        toast.error(errData.error || "Failed to process conversation");
        setAssistantView("chat");
        setExtracting(false);
        return;
      }

      const data = await resp.json();
      const actions = data.actions || [];

      if (actions.length === 0) {
        toast("No actions detected from conversation");
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: "I didn't catch any specific actions from our conversation. You can tell me what you need via text!"
        }]);
        setAssistantView("chat");
      } else {
        setProposedActions(actions);
      }
    } catch (err) {
      console.error("Extract actions error:", err);
      toast.error("Failed to process conversation");
      setAssistantView("chat");
    } finally {
      clearInterval(stepTimer);
      setExtracting(false);
    }
  }, []);

  // ─── Execute confirmed actions ───
  const executeActions = async () => {
    if (proposedActions.length === 0) return;
    setExecuting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: "execute_actions", actions: proposedActions }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        toast.error(errData.error || "Failed to execute actions");
        setExecuting(false);
        return;
      }

      const data = await resp.json();
      const results = data.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => r.error).length;

      if (successCount > 0) {
        toast.success(`${successCount} action${successCount > 1 ? "s" : ""} completed!`);
        queryClient.invalidateQueries({ queryKey: ["requests"] });
        queryClient.invalidateQueries({ queryKey: ["brain-captures"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      if (failCount > 0) {
        toast.error(`${failCount} action${failCount > 1 ? "s" : ""} failed`);
      }

      handleOpen(false);
    } catch (err) {
      console.error("Execute actions error:", err);
      toast.error("Failed to execute actions");
    } finally {
      setExecuting(false);
    }
  };

  const removeAction = (index: number) => {
    setProposedActions(prev => prev.filter((_, i) => i !== index));
  };

  const welcomeMessage = useMemo(() => {
    const path = location.pathname;
    if (isSSRole) {
      if (path.startsWith("/requests")) return "Hey! Need to **create a new request** or discuss existing ones?";
      if (path.startsWith("/team/tasks")) return "Hey! Want to **create a task** or look up what's on the board?";
      if (path.startsWith("/team/projects")) return "Hey! Need help with a **project**?";
      if (path.startsWith("/workflow")) return "Hey! Questions about the **content pipeline**?";
      if (path.startsWith("/approvals")) return "Hey! Questions about **approvals** or reviews?";
      return "Hey! I can help you **create requests**, **capture ideas**, or **look up tasks & projects**. What do you need?";
    }
    if (isClientAdmin || isClientAssistant) {
      if (path.startsWith("/client/success")) return "Hi! Want to **submit a content idea** or have a question about your plan?";
      if (path.startsWith("/requests")) return "Hi! Want to **submit a new content request**?";
      if (path.startsWith("/client/brand-twin")) return "Hi! Need help **updating your brand profile**?";
      return "Hey! I can help you **submit content requests** or **save ideas**. What's on your mind?";
    }
    return "Hey! What can I help you with?";
  }, [isSSRole, isClientAdmin, isClientAssistant, location.pathname]);

  if (!isSSRole && !isClient) return null;

  // Build options based on role
  const ssOptions: (keyof typeof ACTION_CONFIG)[] = ["note", "voice", "link", "file", "task", "request", "assistant"];
  const clientOptions: (keyof typeof ACTION_CONFIG)[] = ["note", "voice", "file", "request", "assistant"];
  const options = isSSRole ? ssOptions : clientOptions;

  const needsClient = ["note", "voice", "link", "file"].includes(mode || "");
  const hasClient = !!getClientId();

  // Tool icon mapping for confirmation cards
  const toolIcon = (tool: string) => {
    if (tool === "create_request") return <MessageSquarePlus className="h-4 w-4" />;
    if (tool === "capture_idea") return <PenLine className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  };

  // ─── Content ───
  const captureContent = (
    <div className="space-y-4 p-4 pt-0">
      {/* Mode selector (action grid) */}
      {mode === null && (
        <>
          {isSSRole && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Client (for captures)</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
          )}

          {/* Voice Guidance / Assistant CTA */}
          <button
            onClick={() => setMode("assistant")}
            className="w-full flex items-center gap-3 rounded-xl p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Hub Assistant</p>
              <p className="text-xs text-muted-foreground">Create requests, capture ideas — just ask</p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            {options.filter(k => k !== "assistant").map((key) => {
              const cfg = ACTION_CONFIG[key];
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "request") {
                      setOpen(false);
                      setTimeout(() => setRequestOpen(true), 200);
                    } else {
                      setMode(key);
                      if (key === "file") {
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }
                    }
                  }}
                  className={`flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all active:scale-[0.97] ${cfg.bg} hover:shadow-md`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.bg} ${cfg.text}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Note mode */}
      {mode === "note" && (
        <div className="space-y-3">
          {isSSRole && !clientId && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
          )}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleNoteSubmit(); } }}
            placeholder="What's on your mind?"
            className="min-h-[100px] text-base resize-none rounded-xl bg-card"
            autoFocus
          />
          <Button onClick={handleNoteSubmit} disabled={!input.trim() || saving || (isSSRole && !hasClient)} className="w-full rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Capture</>}
          </Button>
        </div>
      )}

      {/* Link mode */}
      {mode === "link" && (
        <div className="space-y-3">
          {isSSRole && !clientId && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
          )}
          <Input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste a URL..."
            className="rounded-xl"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleLinkSubmit(); }}
          />
          <Button onClick={handleLinkSubmit} disabled={!linkInput.trim() || saving || (isSSRole && !hasClient)} className="w-full rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 className="h-4 w-4 mr-2" /> Save Link</>}
          </Button>
        </div>
      )}

      {/* Voice mode */}
      {mode === "voice" && (
        <div className="space-y-4">
          {isSSRole && !clientId && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
          )}
          <div className="flex flex-col items-center gap-4 py-6">
            {!recording && !transcribing && (
              <Button
                onClick={startRecording}
                variant="outline"
                className="h-20 w-20 rounded-full"
                disabled={isSSRole && !hasClient}
              >
                <Mic className="h-8 w-8 text-destructive" />
              </Button>
            )}
            {recording && (
              <Button onClick={stopRecording} variant="destructive" className="h-20 w-20 rounded-full animate-pulse">
                <Square className="h-6 w-6" />
              </Button>
            )}
            {transcribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcribing...
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {recording ? "Recording... tap to stop" : transcribing ? "Processing your voice note" : "Tap to start recording"}
            </p>
          </div>
        </div>
      )}

      {/* File mode */}
      {mode === "file" && (
        <div className="space-y-3">
          {isSSRole && !clientId && (
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <ClientSelectWithCreate value={clientId} onValueChange={setClientId} />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Paperclip className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a file to upload</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSSRole && !hasClient} className="rounded-xl">
              Choose File
            </Button>
            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task mode (SS only) */}
      {mode === "task" && (
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" /></div>
          <div><Label>Client</Label><ClientSelectWithCreate value={clientId} onValueChange={setClientId} /></div>
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
          <Button onClick={saveTask} disabled={!taskTitle.trim() || saving} className="w-full rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
          </Button>
        </div>
      )}

      {/* Assistant mode */}
      {mode === "assistant" && (
        <div className="flex flex-col -mx-4 -mb-4" style={{ height: "60vh", maxHeight: "60vh" }}>

          {/* ── Text Chat View ── */}
          {assistantView === "chat" && (
            <>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 text-sm">
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                      <ReactMarkdown>{welcomeMessage}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl p-3 text-sm max-w-[85%]",
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted/50"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>

              <div className="border-t p-3 flex gap-2 items-end">
                <Textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask me anything..."
                  className="min-h-[40px] max-h-[120px] resize-none rounded-xl text-sm"
                  rows={1}
                  disabled={chatLoading}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={startVoiceCall}
                  disabled={chatLoading || voiceConnecting}
                  className="rounded-xl shrink-0 h-10 w-10"
                  title="Start voice call"
                >
                  {voiceConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="rounded-xl shrink-0 h-10 w-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ── Voice Call View ── */}
          {assistantView === "voice-call" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
              {/* Orb visualization */}
              <div className="relative">
                <div className={cn(
                  "h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center transition-all",
                  conversation.isSpeaking && "scale-110 shadow-[0_0_60px_hsl(var(--primary)/0.4)]",
                  !conversation.isSpeaking && conversation.status === "connected" && "animate-pulse"
                )}>
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                </div>
                {conversation.status === "connected" && (
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {conversation.isSpeaking ? "Assistant is speaking..." : conversation.status === "connected" ? "Listening..." : "Connecting..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Speak naturally — I'll summarize your requests when you're done
                </p>
              </div>

              <Button
                onClick={endVoiceCall}
                variant="destructive"
                size="lg"
                className="rounded-full px-8 gap-2"
                disabled={conversation.status !== "connected"}
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>
            </div>
          )}

          {/* ── Confirmation View ── */}
          {assistantView === "confirm" && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {extracting ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">{processingStep || "Processing..."}</p>
                  <p className="text-xs text-muted-foreground">Please don't close this — almost done!</p>
                </div>
              ) : proposedActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <p className="text-sm text-muted-foreground">No actions found</p>
                  <Button variant="outline" onClick={() => setAssistantView("chat")} className="rounded-xl">
                    Back to Chat
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center pb-2">
                    <p className="text-sm font-medium text-foreground">Review & Confirm</p>
                    <p className="text-xs text-muted-foreground">These actions will be created when you confirm</p>
                  </div>

                  {proposedActions.map((action, i) => (
                    <div key={i} className="border rounded-xl p-3 space-y-2 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                            {toolIcon(action.tool)}
                          </div>
                          <span>{action.summary}</span>
                        </div>
                        <button
                          onClick={() => removeAction(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {action.args.notes && (
                        <p className="text-xs text-muted-foreground pl-9">{action.args.notes}</p>
                      )}
                      {action.args.priority && action.args.priority !== "normal" && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-9">{action.args.priority}</span>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setProposedActions([]);
                        setAssistantView("chat");
                      }}
                      className="flex-1 rounded-xl"
                      disabled={executing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={executeActions}
                      disabled={executing || proposedActions.length === 0}
                      className="flex-1 rounded-xl gap-2"
                    >
                      {executing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Confirm All ({proposedActions.length})
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
    </div>
  );

  const headerContent = (
    <div className="flex items-center gap-2">
      {mode && (
        <button
          onClick={() => {
            if (mode === "assistant" && assistantView !== "chat") {
              if (assistantView === "voice-call") {
                endVoiceCall();
              }
              setAssistantView("chat");
            } else {
              setMode(null);
            }
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      {mode === null ? "Quick Capture" : mode === "assistant" ? (
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          {assistantView === "voice-call" ? "Voice Call" : assistantView === "confirm" ? "Review Actions" : "Hub Assistant"}
        </span>
      ) : ACTION_CONFIG[mode]?.label || "Capture"}
    </div>
  );

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

      {/* Mobile: Drawer / Desktop: Dialog */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>{headerContent}</DrawerTitle>
            </DrawerHeader>
            <div className={cn("overflow-y-auto", mode !== "assistant" && "pb-6")}>
              {captureContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogContent className={cn("sm:max-w-md", mode === "assistant" ? "p-0 gap-0 overflow-hidden" : "max-h-[85vh] overflow-y-auto")}>
            <DialogHeader className={mode === "assistant" ? "p-4 pb-0" : ""}>
              <DialogTitle>{headerContent}</DialogTitle>
            </DialogHeader>
            {captureContent}
          </DialogContent>
        </Dialog>
      )}

      <MakeRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </>
  );
}
