import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "george";
  text: string;
  ts: number;
}

interface GeorgeChatProps {
  uploadId?: string; // if set, George sees only that upload's data
}

const SUGGESTED_QUESTIONS = [
  "What's our biggest expense this period?",
  "Break down spend by category",
  "How much did we spend on advertising?",
  "Compare month-over-month spending",
];

export function GeorgeChat({ uploadId }: GeorgeChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const resp = await supabase.functions.invoke("george-expenses-chat", {
        body: { question: text.trim(), upload_id: uploadId },
      });

      const answer = resp.data?.answer ?? "Sorry, I couldn't get an answer. Try again.";
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "george", text: answer, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "george",
        text: "Something went wrong. Check that the Anthropic API key is configured in Supabase secrets.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center",
          "bg-[#1e3a5f] hover:bg-[#2d5986] text-white",
          open && "rotate-0 scale-95"
        )}
        aria-label="Open George AI assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl shadow-2xl border border-border/60 bg-card overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-[#1e3a5f] shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#C5A258]/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-[#C5A258]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">George</p>
              <p className="text-[10px] text-white/50">Premiere AI · expense assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <div className="bg-muted/40 rounded-xl rounded-tl-sm px-3 py-2.5 text-sm text-foreground max-w-[85%]">
                  Hi Don — I can answer questions about your expense data. What would you like to know?
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border/60 hover:border-[#C5A258]/50 hover:bg-[#C5A258]/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-[#1e3a5f] text-white rounded-br-sm"
                      : "bg-muted/40 text-foreground rounded-tl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/40 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">George is thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/60 px-3 py-3 flex items-center gap-2 shrink-0 bg-card">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask George..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 h-8 w-8 rounded-lg bg-[#1e3a5f] hover:bg-[#2d5986] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
