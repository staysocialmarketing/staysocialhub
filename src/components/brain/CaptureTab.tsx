import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Mic, Link2, FileUp, Lightbulb, Send, Trash2, MessageSquarePlus,
  Tag, ChevronDown, ChevronUp, Paperclip, Plus, Square, X
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

export default function CaptureTab({ clientId }: CaptureTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch captures
  const { data: captures = [] } = useQuery({
    queryKey: ["brain-captures", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brain_captures" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch creator names
      const userIds = [...new Set((data || []).map((d: any) => d.created_by_user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", userIds);
        if (users) {
          userMap = Object.fromEntries(
            users.map((u) => [u.id, u.name || u.email])
          );
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

  // Insert capture
  const insertMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase.from("brain_captures" as any).insert({
        client_id: clientId,
        created_by_user_id: user?.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] });
    },
    onError: () => toast.error("Failed to save capture"),
  });

  // Delete capture
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brain_captures" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  // Update notes
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("brain_captures" as any)
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures", clientId] });
      setEditingNotesId(null);
      toast.success("Notes saved");
    },
  });

  // Submit text/idea
  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    insertMutation.mutate({ type: "note", content: text });
    setInput("");
    toast.success("Captured!");
  }, [input, insertMutation]);

  // Submit link
  const handleLinkSubmit = useCallback(() => {
    const url = linkInput.trim();
    if (!url) return;
    insertMutation.mutate({
      type: "link",
      content: url,
      link_url: url,
    });
    setLinkInput("");
    setLinkMode(false);
    toast.success("Link captured!");
  }, [linkInput, insertMutation]);

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      const path = `captures/${clientId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("creative-assets")
        .upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage
        .from("creative-assets")
        .getPublicUrl(path);
      insertMutation.mutate({
        type: "file",
        content: file.name,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
      });
      toast.success(`${file.name} captured!`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const path = `captures/${clientId}/${Date.now()}-voice.webm`;
        const { error } = await supabase.storage
          .from("creative-assets")
          .upload(path, blob);
        if (error) {
          toast.error("Failed to upload voice recording");
          return;
        }
        const { data: urlData } = supabase.storage
          .from("creative-assets")
          .getPublicUrl(path);

        // Transcribe
        setTranscribing(true);
        let transcript = "";
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            "transcribe-capture",
            { body: { audioUrl: urlData.publicUrl } }
          );
          if (fnError) throw fnError;
          transcript = data?.transcript || "";
        } catch {
          console.error("Transcription failed");
        }
        setTranscribing(false);

        insertMutation.mutate({
          type: "voice",
          content: transcript || "Voice note",
          attachment_url: urlData.publicUrl,
          attachment_name: "voice.webm",
          voice_transcript: transcript,
        });
        toast.success("Voice captured!");
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const typeIcon: Record<string, string> = {
    note: "📝",
    voice: "🎤",
    link: "🔗",
    file: "📄",
    idea: "💡",
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Input Area */}
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Drop an idea, voice note, or link..."
          className="min-h-[80px] text-base resize-none pr-12 bg-background border-border"
          rows={3}
        />
        {input.trim() && (
          <Button
            size="icon"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full"
            onClick={handleSubmit}
            disabled={insertMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Link inline input */}
      {linkMode && (
        <div className="flex gap-2 items-center">
          <Input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste a URL..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLinkSubmit();
              if (e.key === "Escape") setLinkMode(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleLinkSubmit} disabled={!linkInput.trim()}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setLinkMode(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={recording ? "destructive" : "outline"}
          size="lg"
          className="flex-1 max-w-[120px] gap-2"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
        >
          {recording ? (
            <>
              <Square className="h-4 w-4" /> Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" /> Voice
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 max-w-[120px] gap-2"
          onClick={() => setLinkMode(true)}
        >
          <Link2 className="h-4 w-4" /> Link
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 max-w-[120px] gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="h-4 w-4" /> File
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 max-w-[120px] gap-2"
          onClick={() => {
            setInput((prev) => (prev ? prev : ""));
            inputRef.current?.focus();
          }}
        >
          <Lightbulb className="h-4 w-4" /> Idea
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {transcribing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Transcribing voice...
        </div>
      )}

      {/* Captured Items */}
      <div className="space-y-2">
        {captures.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No captures yet. Drop your first idea above!
          </p>
        )}
        {captures.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="border border-border rounded-lg bg-card overflow-hidden"
            >
              {/* Card Header */}
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : item.id)}
              >
                <span className="text-lg shrink-0 mt-0.5">
                  {typeIcon[item.type] || "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.content || item.attachment_name || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {item.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, h:mm a")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · {item.creator_name}
                    </span>
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>

              {/* Expanded Content */}
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Full content */}
                  {item.content && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {item.content}
                    </p>
                  )}

                  {/* Voice transcript */}
                  {item.voice_transcript && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Transcript
                      </p>
                      <p className="text-sm text-foreground">
                        {item.voice_transcript}
                      </p>
                    </div>
                  )}

                  {/* Attachment */}
                  {item.attachment_url && (
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {item.attachment_name || "View attachment"}
                    </a>
                  )}

                  {/* Link */}
                  {item.link_url && (
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {item.link_url}
                    </a>
                  )}

                  {/* Notes */}
                  {item.notes && editingNotesId !== item.id && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-foreground">{item.notes}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Edit notes inline */}
                  {editingNotesId === item.id && (
                    <div className="space-y-2">
                      <Textarea
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder="Add notes..."
                        rows={2}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateNotesMutation.mutate({
                              id: item.id,
                              notes: notesInput,
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNotesId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => {
                        setEditingNotesId(item.id);
                        setNotesInput(item.notes || "");
                      }}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Notes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this capture?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-3 flex gap-2 md:hidden">
        <Button
          className="flex-1 gap-1.5"
          onClick={() => {
            inputRef.current?.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Plus className="h-4 w-4" /> Add Idea
        </Button>
        <Button
          variant={recording ? "destructive" : "outline"}
          size="icon"
          className="h-10 w-10"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
