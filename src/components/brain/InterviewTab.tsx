import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Send, Sparkles, Plus, Loader2, CheckCircle2, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import VoiceCallPanel from "./VoiceCallPanel";

type Message = { role: "user" | "assistant"; content: string; timestamp?: string };

type Interview = {
  id: string;
  client_id: string;
  template: string;
  messages: Message[];
  extracted_data: any;
  status: string;
  created_at: string;
};

const TEMPLATES = [
  { value: "full_onboarding", label: "Full Onboarding", desc: "Comprehensive brand discovery" },
  { value: "brand_voice", label: "Brand Voice", desc: "Define communication style" },
  { value: "audience", label: "Audience Deep Dive", desc: "Understand target customers" },
  { value: "content_strategy", label: "Content Strategy", desc: "Platforms & content planning" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`;

export default function InterviewTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [template, setTemplate] = useState("full_onboarding");
  const [voiceMode, setVoiceMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch existing interviews
  const { data: interviews } = useQuery({
    queryKey: ["brain-interviews", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brain_interviews" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Interview[];
    },
  });

  // Load interview when selected
  useEffect(() => {
    if (activeInterviewId && interviews) {
      const interview = interviews.find((i) => i.id === activeInterviewId);
      if (interview) {
        setMessages(interview.messages || []);
        setTemplate(interview.template);
      }
    }
  }, [activeInterviewId, interviews]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save interview to DB
  const saveMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      if (activeInterviewId) {
        const { error } = await supabase
          .from("brain_interviews" as any)
          .update({ messages: msgs as any } as any)
          .eq("id", activeInterviewId);
        if (error) throw error;
      } else {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("brain_interviews" as any)
          .insert({
            client_id: clientId,
            started_by_user_id: userId,
            template,
            messages: msgs as any,
            status: "active",
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        setActiveInterviewId((data as any).id);
      }
      queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
    },
  });

  const streamChat = useCallback(
    async (allMessages: Message[]) => {
      setIsStreaming(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast.error("Not authenticated");
        setIsStreaming(false);
        return;
      }

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "chat",
            client_id: clientId,
            template,
            messages: allMessages,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Unknown error" }));
          toast.error(err.error || "AI request failed");
          setIsStreaming(false);
          return;
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantSoFar = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
              }
            } catch {}
          }
        }

        // Save after streaming complete
        const finalMessages: Message[] = [
          ...allMessages,
          { role: "assistant", content: assistantSoFar, timestamp: new Date().toISOString() },
        ];
        setMessages(finalMessages);
        saveMutation.mutate(finalMessages);
      } catch (err) {
        console.error("Stream error:", err);
        toast.error("Failed to get AI response");
      } finally {
        setIsStreaming(false);
      }
    },
    [clientId, template, activeInterviewId]
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    streamChat(newMessages);
  };

  const startNew = () => {
    setActiveInterviewId(null);
    setMessages([]);
    setInput("");
    setVoiceMode(false);
  };

  const startVoiceCall = () => {
    setActiveInterviewId(null);
    setMessages([]);
    setInput("");
    setVoiceMode(true);
  };

  const handleVoiceCallEnd = (voiceMessages: Message[]) => {
    setMessages(voiceMessages);
    setVoiceMode(false);
    // Save the voice transcript as a new interview
    saveMutation.mutate(voiceMessages);
    toast.success("Voice interview saved! You can now extract insights to the Brand Twin.");
  };

  const handleVoiceCancel = () => {
    setVoiceMode(false);
  };

  const handleExtract = async () => {
    if (messages.length < 4) {
      toast.error("Need more conversation to extract data");
      return;
    }
    setIsExtracting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "extract",
          client_id: clientId,
          messages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Extraction failed" }));
        toast.error(err.error || "Extraction failed");
        return;
      }

      const { extracted_data } = await resp.json();

      // Save extracted data to interview
      if (activeInterviewId) {
        await supabase
          .from("brain_interviews" as any)
          .update({ extracted_data, status: "extracted" } as any)
          .eq("id", activeInterviewId);
      }

      // Merge into Brand Twin
      const { data: existing } = await supabase
        .from("brand_twin" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      const mergeSection = (existing: any, extracted: any) => {
        if (!extracted) return existing || {};
        const merged = { ...(existing || {}) };
        for (const [key, value] of Object.entries(extracted)) {
          if (value !== null && value !== undefined && value !== "") {
            if (Array.isArray(value) && value.length > 0) {
              const existingArr = Array.isArray(merged[key]) ? merged[key] : [];
              merged[key] = [...new Set([...existingArr, ...value])];
            } else if (typeof value === "string" && value.trim()) {
              merged[key] = value;
            }
          }
        }
        return merged;
      };

      const payload = {
        client_id: clientId,
        brand_basics_json: mergeSection((existing as any)?.brand_basics_json, extracted_data.brand_basics),
        brand_voice_json: mergeSection((existing as any)?.brand_voice_json, extracted_data.brand_voice),
        audience_json: mergeSection((existing as any)?.audience_json, extracted_data.audience),
        offers_json: mergeSection((existing as any)?.offers_json, extracted_data.offers),
        content_rules_json: mergeSection((existing as any)?.content_rules_json, extracted_data.content_rules),
      };

      if (existing) {
        await supabase.from("brand_twin" as any).update(payload).eq("client_id", clientId);
      } else {
        await supabase.from("brand_twin" as any).insert(payload);
      }

      queryClient.invalidateQueries({ queryKey: ["brand-twin", clientId] });
      queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
      toast.success("Brand Twin updated with interview insights!");
    } catch (err) {
      console.error("Extract error:", err);
      toast.error("Failed to extract data");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeInterview = interviews?.find((i) => i.id === activeInterviewId);
  const hasExtracted = activeInterview?.status === "extracted";

  return (
    <div className="space-y-4">
      {/* Header with template select and controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Select value={template} onValueChange={setTemplate} disabled={messages.length > 0}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div>
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtract}
              disabled={isExtracting || messages.length < 4}
              className="gap-1.5"
            >
              {isExtracting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasExtracted ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {hasExtracted ? "Re-extract" : "Extract to Brain"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={startNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Interview
          </Button>
        </div>
      </div>

      {/* Previous interviews */}
      {interviews && interviews.length > 0 && !activeInterviewId && messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Previous Interviews</p>
          <div className="grid gap-2">
            {interviews.map((interview) => (
              <Card
                key={interview.id}
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setActiveInterviewId(interview.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {TEMPLATES.find((t) => t.value === interview.template)?.label || interview.template}
                    </span>
                    <Badge
                      variant={interview.status === "extracted" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {interview.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(interview.messages || []).length} messages
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Voice call mode */}
      {voiceMode && (
        <div className="border rounded-lg bg-muted/30 flex flex-col" style={{ height: "min(500px, 60vh)" }}>
          <VoiceCallPanel
            clientId={clientId}
            template={template}
            onCallEnd={handleVoiceCallEnd}
            onCancel={handleVoiceCancel}
          />
        </div>
      )}

      {/* Chat area */}
      {!voiceMode && (
      <div className="border rounded-lg bg-muted/30 flex flex-col" style={{ height: "min(500px, 60vh)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <Brain className="h-10 w-10 text-primary/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Brand Interview</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a conversation to build the Brand Twin through natural dialogue
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={startNew} size="sm" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Text Interview
                </Button>
                <Button onClick={startVoiceCall} size="sm" variant="outline" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Voice Call
                </Button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-background border rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p+p]:mt-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-background border rounded-2xl rounded-bl-md px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {messages.length > 0 && (
          <div className="border-t p-3 flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
