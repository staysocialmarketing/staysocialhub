import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Mic, Link2, Paperclip, Send, Trash2, MessageSquarePlus,
  Search, PenLine, Square, Plus, X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface CaptureTabProps {
  clientId: string;
}

type CaptureItem = {
  id: string;
  client_id: string;
  created_by_user_id: string;
  type: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  voice_transcript: string | null;
  link_url: string | null;
  notes: string | null;
  tags: string[];
  converted_to_request_id: string | null;
  created_at: string;
  creator_name?: string;
};

const TYPE_CONFIG = {
  note: { label: "Pin a Thought", icon: PenLine, bg: "bg-primary/10", text: "text-primary", border: "border-l-primary", desc: "Jot down an idea" },
  voice: { label: "Record Voice", icon: Mic, bg: "bg-destructive/10", text: "text-destructive", border: "border-l-destructive", desc: "Speak your mind" },
  link: { label: "Add Link", icon: Link2, bg: "bg-info/10", text: "text-info", border: "border-l-info", desc: "Save a reference" },
  file: { label: "Upload File", icon: Paperclip, bg: "bg-success/10", text: "text-success", border: "border-l-success", desc: "Attach a document" },
} as const;

const FILTER_OPTIONS = ["All", "Notes", "Voice", "Links", "Files"] as const;
const FILTER_MAP: Record<string, string | null> = {
  All: null, Notes: "note", Voice: "voice", Links: "link", Files: "file",
};

const TYPE_EMOJI: Record<string, string> = {
  note: "📝", voice: "🎤", link: "🔗", file: "📄", idea: "💡",
};

export default function CaptureTab({ clientId }: CaptureTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // UI state
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstName = user?.user_metadata?.name?.split(" ")[0] || "there";

  // ─── Data queries (unchanged logic) ───
  const { data: captures = [] } = useQuery({
    queryKey: ["brain-captures", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brain_captures" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((d: any) => d.created_by_user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", userIds);
        if (users) {
          userMap = Object.fromEntries(users.map((u) => [u.id, u.name || u.email]));
        }
      }

      return (data || []).map((item: any) => ({
        ...item,
        tags: item.tags || [],
        creator_name: userMap[item.created_by_user_id] || "Unknown",
      })) as CaptureItem[];
    },
    enabled: !!clientId,
  });

  // ─── Mutations (unchanged logic) ───
  const insertMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase.from("brain_captures" as any).insert({
        client_id: clientId,
        created_by_user_id: user?.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] }),
    onError: () => toast.error("Failed to save capture"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brain_captures" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("brain_captures" as any).update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] });
      setEditingNotesId(null);
      toast.success("Notes saved");
    },
  });

  // ─── Handlers (unchanged logic) ───
  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    insertMutation.mutate({ type: "note", content: text });
    setInput("");
    setShowInput(false);
    toast.success("Captured!");
  }, [input, insertMutation]);

  const handleLinkSubmit = useCallback(() => {
    const url = linkInput.trim();
    if (!url) return;
    insertMutation.mutate({ type: "link", content: url, link_url: url });
    setLinkInput("");
    setLinkMode(false);
    toast.success("Link captured!");
  }, [linkInput, insertMutation]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB limit`); continue; }
      const path = `captures/${clientId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("creative-assets").upload(path, file);
      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
      insertMutation.mutate({ type: "file", content: file.name, attachment_url: urlData.publicUrl, attachment_name: file.name });
      toast.success(`${file.name} captured!`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const path = `captures/${clientId}/${Date.now()}-voice.webm`;
        const { error } = await supabase.storage.from("creative-assets").upload(path, blob);
        if (error) { toast.error("Failed to upload voice recording"); return; }
        const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
        setTranscribing(true);
        let transcript = "";
        try {
          const { data, error: fnError } = await supabase.functions.invoke("transcribe-capture", { body: { audioUrl: urlData.publicUrl } });
          if (fnError) throw fnError;
          transcript = data?.transcript || "";
        } catch { console.error("Transcription failed"); }
        setTranscribing(false);
        insertMutation.mutate({ type: "voice", content: transcript || "Voice note", attachment_url: urlData.publicUrl, attachment_name: "voice.webm", voice_transcript: transcript });
        toast.success("Voice captured!");
      };
      mediaRecorder.start();
      setRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  // ─── Filtering ───
  const typeFilter = FILTER_MAP[activeFilter];
  const filteredCaptures = captures.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.content?.toLowerCase().includes(q) ||
        item.voice_transcript?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ─── Action cards config ───
  const actions = [
    { key: "note", ...TYPE_CONFIG.note, onClick: () => { setShowInput(true); setLinkMode(false); setTimeout(() => inputRef.current?.focus(), 100); } },
    { key: "voice", ...TYPE_CONFIG.voice, onClick: recording ? stopRecording : startRecording },
    { key: "link", ...TYPE_CONFIG.link, onClick: () => { setLinkMode(true); setShowInput(false); } },
    { key: "file", ...TYPE_CONFIG.file, onClick: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="space-y-6 pb-28 md:pb-6">
      {/* ─── Greeting ─── */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Hi {firstName} {getWaveEmoji(firstName)}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Anything to capture?
        </p>
      </div>

      {/* ─── Action Grid ─── */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isRecordingThis = action.key === "voice" && recording;
          return (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={action.key === "voice" && transcribing}
              className={`relative flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all active:scale-[0.97] ${
                isRecordingThis
                  ? "bg-destructive/15 ring-2 ring-destructive"
                  : action.bg
              } hover:shadow-md`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.bg} ${action.text}`}>
                {isRecordingThis ? <Square className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isRecordingThis ? "Stop Recording" : action.label}
                </p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              {isRecordingThis && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Text Input (slides open) ─── */}
      {showInput && (
        <div className="relative animate-in slide-in-from-top-2 duration-200">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="min-h-[80px] text-base resize-none pr-12 bg-card border-border rounded-xl"
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-muted-foreground"
              onClick={() => { setShowInput(false); setInput(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
            {input.trim() && (
              <Button
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleSubmit}
                disabled={insertMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── Link Input ─── */}
      {linkMode && (
        <div className="flex gap-2 items-center animate-in slide-in-from-top-2 duration-200">
          <Input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste a URL..."
            className="flex-1 rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLinkSubmit();
              if (e.key === "Escape") setLinkMode(false);
            }}
            autoFocus
          />
          <Button size="sm" className="rounded-full" onClick={handleLinkSubmit} disabled={!linkInput.trim()}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setLinkMode(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />

      {transcribing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Transcribing voice...
        </div>
      )}

      {/* ─── Filter Pills + Search ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {showSearch && (
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captures..."
            className="rounded-xl"
            autoFocus
          />
        )}
      </div>

      {/* ─── Capture Feed ─── */}
      <div className="space-y-2">
        {filteredCaptures.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <span className="text-4xl mb-3">💡</span>
            <p className="text-sm font-medium text-muted-foreground">Your ideas live here</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Capture your first thought above</p>
          </div>
        )}

        {filteredCaptures.map((item) => {
          const expanded = expandedId === item.id;
          const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.note;

          return (
            <div
              key={item.id}
              className={`rounded-xl bg-card border border-border overflow-hidden shadow-sm transition-shadow hover:shadow-md border-l-[3px] ${config.border}`}
            >
              {/* Card Header */}
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                onClick={() => setExpandedId(expanded ? null : item.id)}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${config.bg} ${config.text}`}>
                  {TYPE_EMOJI[item.type] || "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {item.content || item.attachment_name || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, h:mm a")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · {item.creator_name}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {item.content && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{item.content}</p>
                  )}

                  {item.voice_transcript && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
                      <p className="text-sm text-foreground">{item.voice_transcript}</p>
                    </div>
                  )}

                  {item.attachment_url && (
                    <a href={item.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Paperclip className="h-3.5 w-3.5" />
                      {item.attachment_name || "View attachment"}
                    </a>
                  )}

                  {item.link_url && (
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Link2 className="h-3.5 w-3.5" />
                      {item.link_url}
                    </a>
                  )}

                  {item.notes && editingNotesId !== item.id && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground">{item.notes}</p>
                    </div>
                  )}

                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {editingNotesId === item.id && (
                    <div className="space-y-2">
                      <Textarea
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder="Add notes..."
                        rows={2}
                        className="text-sm rounded-xl"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="rounded-full" onClick={() => updateNotesMutation.mutate({ id: item.id, notes: notesInput })}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingNotesId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-full"
                      onClick={() => { setEditingNotesId(item.id); setNotesInput(item.notes || ""); }}>
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Notes
                    </Button>
                    <Button variant="outline" size="sm"
                      className="text-xs gap-1.5 rounded-full text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this capture?")) deleteMutation.mutate(item.id); }}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Mobile Sticky Bar (refined) ─── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => {
              setShowInput(true);
              setLinkMode(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => inputRef.current?.focus(), 300);
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className={`h-12 w-12 rounded-full shadow-md ${
              recording ? "bg-destructive hover:bg-destructive/90" : ""
            }`}
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
          >
            {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
