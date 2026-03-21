import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = { role: "user" | "assistant"; content: string };

export function HubAssistant() {
  const { profile, isSSRole, isClientAdmin, isClientAssistant } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isClient = isClientAdmin || isClientAssistant;
  const canUse = isSSRole || isClient;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setMessages([]);
    setInput("");
    setIsLoading(false);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    if (trimmed.length > 2000) {
      toast.error("Message too long (max 2000 characters)");
      return;
    }

    const userMsg: Msg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to use the assistant");
        setIsLoading(false);
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
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || "Something went wrong";
        if (resp.status === 429) {
          toast.error("Rate limited — please try again in a moment");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted — please add funds in Settings");
        } else {
          toast.error(errMsg);
        }
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      const assistantContent = data.response || "I'm not sure how to help with that.";
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (err) {
      console.error("Hub assistant error:", err);
      toast.error("Failed to reach assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!canUse) return null;

  const welcomeMessage = isSSRole
    ? "Hey! I can help you **create requests** or **capture ideas** for any client. What do you need?"
    : "Hey! I can help you **submit content requests** or **save ideas**. What's on your mind?";

  const chatContent = (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
              <ReactMarkdown>{welcomeMessage}</ReactMarkdown>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
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
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 items-end">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="min-h-[40px] max-h-[120px] resize-none rounded-xl text-sm"
          rows={1}
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="rounded-xl shrink-0 h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-36 right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Hub Assistant"
        >
          <Sparkles className="h-5 w-5" />
        </button>

        <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <DrawerTitle className="text-base">Hub Assistant</DrawerTitle>
              </div>
            </DrawerHeader>
            {chatContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Hub Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 flex-row items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DialogTitle className="text-base">Hub Assistant</DialogTitle>
          </DialogHeader>
          {chatContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
