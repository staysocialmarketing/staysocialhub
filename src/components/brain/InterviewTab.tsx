import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Send, Sparkles, Plus, Loader2, CheckCircle2, Phone, Trash2, Globe, Users, Megaphone, MessageSquare, ArrowLeft } from "lucide-react";
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
  updated_at: string;
};

const TEMPLATES = [
  { value: "full_onboarding", label: "Full Onboarding", desc: "Comprehensive brand discovery — voice, audience, offers & goals", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Brain },
  { value: "brand_voice", label: "Brand Voice", desc: "Define communication style, tone & messaging", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: MessageSquare },
  { value: "audience", label: "Audience Deep Dive", desc: "Understand target customers & pain points", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: Users },
  { value: "content_strategy", label: "Content Strategy", desc: "Platforms, content types & posting goals", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: Megaphone },
  { value: "website_discovery", label: "Website Discovery", desc: "Design, pages, functionality & integrations", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", icon: Globe },
];

const WEBSITE_TEMPLATES = new Set(["website_discovery"]);

const TEMPLATE_OPENERS: Record<string, string> = {
  full_onboarding: "Start the comprehensive brand onboarding interview. Introduce yourself warmly and ask about their business story and what inspired them to start.",
  brand_voice: "Start the brand voice deep dive. Introduce yourself as a brand voice specialist and ask how they'd describe the way they naturally talk about their business.",
  audience: "Start the audience research session. Introduce yourself as an audience research specialist and ask them to describe their ideal customer.",
  content_strategy: "Start the content strategy session. Introduce yourself as a content strategy consultant and ask what platforms they're currently using.",
  website_discovery: "Start the website discovery session. Introduce yourself as a website strategist and ask about their current website situation — do they have one, what's working, what's not.",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`;

export default function InterviewTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const autoExtractedRef = useRef<string | null>(null);
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
        .order("updated_at", { ascending: false });
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

  // Auto-extract helper
  const triggerAutoExtract = useCallback(async (msgs: Message[], interviewId: string | null) => {
    if (!interviewId || msgs.length < 6) return;
    if (autoExtractedRef.current === interviewId) return;
    autoExtractedRef.current = interviewId;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      // Determine the active template for this interview
      const interview = (await supabase
        .from("brain_interviews" as any)
        .select("template")
        .eq("id", interviewId)
        .maybeSingle()).data as any;
      const interviewTemplate = interview?.template || "full_onboarding";
      const isWebsite = WEBSITE_TEMPLATES.has(interviewTemplate);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "extract", client_id: clientId, messages: msgs, template: interviewTemplate }),
      });

      if (!resp.ok) return;

      const { extracted_data } = await resp.json();

      await supabase
        .from("brain_interviews" as any)
        .update({ extracted_data, status: "extracted" } as any)
        .eq("id", interviewId);

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

      if (isWebsite) {
        const { data: existing } = await supabase
          .from("website_briefs" as any)
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();

        const payload = {
          client_id: clientId,
          design_json: mergeSection((existing as any)?.design_json, extracted_data.design),
          layout_json: mergeSection((existing as any)?.layout_json, extracted_data.layout),
          functionality_json: mergeSection((existing as any)?.functionality_json, extracted_data.functionality),
          content_json: mergeSection((existing as any)?.content_json, extracted_data.content),
          inspiration_json: mergeSection((existing as any)?.inspiration_json, extracted_data.inspiration),
        };

        if (existing) {
          await supabase.from("website_briefs" as any).update(payload).eq("client_id", clientId);
        } else {
          await supabase.from("website_briefs" as any).insert(payload);
        }

        queryClient.invalidateQueries({ queryKey: ["website-brief", clientId] });
        toast.success("Website Brief auto-updated with new insights");
      } else {
        const { data: existing } = await supabase
          .from("brand_twin" as any)
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();

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
        toast.success("Brand Twin auto-updated with new insights");
      }

      queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
    } catch (err) {
      console.error("Auto-extract error:", err);
    }
  }, [clientId, queryClient]);

  // Save interview to DB
  const saveMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      if (activeInterviewId) {
        const { error } = await supabase
          .from("brain_interviews" as any)
          .update({ messages: msgs as any, updated_at: new Date().toISOString() } as any)
          .eq("id", activeInterviewId);
        if (error) throw error;
        return activeInterviewId;
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
        const newId = (data as any).id;
        setActiveInterviewId(newId);
        return newId;
      }
    },
    onSuccess: (interviewId, msgs) => {
      queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
      // Auto-extract after 6+ messages
      if (msgs.length >= 6) {
        triggerAutoExtract(msgs, interviewId);
      }
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
    setTemplate(null);
    autoExtractedRef.current = null;
  };

  const startVoiceCall = () => {
    // Don't reset activeInterviewId or messages — voice appends to current session
    setVoiceMode(true);
  };

  const handleVoiceCallEnd = (voiceMessages: Message[]) => {
    // Append voice messages to existing conversation
    const combined = [...messages, ...voiceMessages];
    setMessages(combined);
    setVoiceMode(false);
    saveMutation.mutate(combined);
    toast.success("Voice transcript added to interview");
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
    const isWebsite = WEBSITE_TEMPLATES.has(template);
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
          template,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Extraction failed" }));
        toast.error(err.error || "Extraction failed");
        return;
      }

      const { extracted_data } = await resp.json();

      if (activeInterviewId) {
        await supabase
          .from("brain_interviews" as any)
          .update({ extracted_data, status: "extracted" } as any)
          .eq("id", activeInterviewId);
      }

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

      if (isWebsite) {
        const { data: existing } = await supabase
          .from("website_briefs" as any)
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();

        const payload = {
          client_id: clientId,
          design_json: mergeSection((existing as any)?.design_json, extracted_data.design),
          layout_json: mergeSection((existing as any)?.layout_json, extracted_data.layout),
          functionality_json: mergeSection((existing as any)?.functionality_json, extracted_data.functionality),
          content_json: mergeSection((existing as any)?.content_json, extracted_data.content),
          inspiration_json: mergeSection((existing as any)?.inspiration_json, extracted_data.inspiration),
        };

        if (existing) {
          await supabase.from("website_briefs" as any).update(payload).eq("client_id", clientId);
        } else {
          await supabase.from("website_briefs" as any).insert(payload);
        }

        queryClient.invalidateQueries({ queryKey: ["website-brief", clientId] });
        toast.success("Website Brief updated with interview insights!");
      } else {
        const { data: existing } = await supabase
          .from("brand_twin" as any)
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();

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
        toast.success("Brand Twin updated with interview insights!");
      }

      queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
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

  const getTemplateBadge = (templateValue: string) => {
    const t = TEMPLATES.find((t) => t.value === templateValue);
    if (!t) return null;
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${t.color}`}>
        {t.label}
      </span>
    );
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const activeInterview = interviews?.find((i) => i.id === activeInterviewId);
  const hasExtracted = activeInterview?.status === "extracted";
  const isResuming = !!activeInterviewId && messages.length > 0;

  // Template not yet selected — show picker
  const showTemplatePicker = !template && !activeInterviewId && messages.length === 0;

  return (
    <div className="space-y-4">
      {/* Header with template select and controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {template ? (
            <Select value={template} onValueChange={setTemplate} disabled={!!activeInterviewId}>
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
          ) : (
            <p className="text-sm font-medium text-muted-foreground">Select an interview type to begin</p>
          )}
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
              {hasExtracted ? "Re-extract" : WEBSITE_TEMPLATES.has(template || "") ? "Extract to Website Brief" : "Extract to Brain"}
            </Button>
          )}
          {(template || activeInterviewId) && (
            <Button variant="outline" size="sm" onClick={startNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Interview
            </Button>
          )}
        </div>
      </div>

      {/* Template Picker Grid */}
      {showTemplatePicker && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <Card
                  key={t.value}
                  className="p-4 cursor-pointer hover:bg-accent/50 hover:border-primary/30 transition-all group"
                  onClick={() => setTemplate(t.value)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${t.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Previous interviews below the picker */}
          {interviews && interviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Previous Interviews</p>
              <div className="grid gap-2">
                {interviews.map((interview) => (
                  <Card
                    key={interview.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setActiveInterviewId(interview.id);
                      setTemplate(interview.template);
                      autoExtractedRef.current = null;
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        {getTemplateBadge(interview.template)}
                        <Badge
                          variant={interview.status === "extracted" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {interview.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(interview.updated_at || interview.created_at)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm("Delete this interview?")) return;
                            supabase
                              .from("brain_interviews" as any)
                              .delete()
                              .eq("id", interview.id)
                              .then(({ error }) => {
                                if (error) {
                                  toast.error("Failed to delete interview");
                                } else {
                                  toast.success("Interview deleted");
                                  queryClient.invalidateQueries({ queryKey: ["brain-interviews", clientId] });
                                }
                              });
                          }}
                          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {(interview.messages || []).length} messages
                      </p>
                      <span className="text-xs text-primary font-medium">Continue →</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template selected but no conversation yet — show start buttons */}
      {template && !activeInterviewId && messages.length === 0 && !voiceMode && !showTemplatePicker && (
        <div className="border rounded-lg bg-muted/30 flex flex-col" style={{ height: "min(500px, 60vh)" }}>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
            {(() => {
              const t = TEMPLATES.find(tp => tp.value === template);
              const Icon = t?.icon || Brain;
              return (
                <>
                  <div className={`rounded-xl p-3 ${t?.color || ""}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t?.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t?.desc}</p>
                  </div>
                </>
              );
            })()}
            <div className="flex gap-2 mt-3">
              <Button onClick={() => streamChat([])} size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Text Interview
              </Button>
              <Button onClick={() => setVoiceMode(true)} size="sm" variant="outline" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Voice Call
              </Button>
            </div>
            <button
              onClick={() => setTemplate(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to templates
            </button>
          </div>
        </div>
      )}

      {/* Voice call mode */}
      {voiceMode && (
        <div className="border rounded-lg bg-muted/30 flex flex-col" style={{ height: "min(500px, 60vh)" }}>
          <VoiceCallPanel
            clientId={clientId}
            template={template || "full_onboarding"}
            existingMessages={messages}
            onCallEnd={handleVoiceCallEnd}
            onCancel={handleVoiceCancel}
          />
        </div>
      )}

      {/* Chat area — active conversation */}
      {!voiceMode && messages.length > 0 && (
      <div className="border rounded-lg bg-muted/30 flex flex-col" style={{ height: "min(500px, 60vh)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            variant="outline"
            onClick={startVoiceCall}
            disabled={isStreaming}
            className="shrink-0 self-end"
            title="Switch to voice"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
