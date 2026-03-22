import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; timestamp?: string };

interface VoiceCallPanelProps {
  clientId: string;
  template: string;
  existingMessages?: Message[];
  onCallEnd: (messages: Message[]) => void;
  onCancel: () => void;
}

export default function VoiceCallPanel({
  clientId,
  template,
  existingMessages = [],
  onCallEnd,
  onCancel,
}: VoiceCallPanelProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [earlyDisconnect, setEarlyDisconnect] = useState(false);
  const hasStartedRef = useRef(false);
  const isStartingRef = useRef(false);
  const sessionStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef<Message[]>([]);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContextRef = useRef<string | null>(null);

  const addMessage = useCallback((msg: Message) => {
    transcriptRef.current = [...transcriptRef.current, msg];
    setTranscript([...transcriptRef.current]);
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log("EL onConnect — session established");
      hasStartedRef.current = true;
      isStartingRef.current = false;
      sessionStartTimeRef.current = Date.now();
      setIsConnecting(false);
      setEarlyDisconnect(false);
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      // Inject template context after connection is stable
      if (pendingContextRef.current) {
        console.log("EL sending contextual update for interview template");
        try {
          conversation.sendContextualUpdate(pendingContextRef.current);
        } catch (e) {
          console.warn("Failed to send contextual update:", e);
        }
        pendingContextRef.current = null;
      }
    },
    onDisconnect: () => {
      const elapsed = Date.now() - sessionStartTimeRef.current;
      console.log("EL onDisconnect — hasStarted:", hasStartedRef.current, "transcript:", transcriptRef.current.length, "elapsed:", elapsed);
      isStartingRef.current = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (hasStartedRef.current) {
        // Early disconnect with no user speech — offer retry
        if (elapsed < 12000 && transcriptRef.current.filter(m => m.role === "user").length === 0 && retryCountRef.current < 2) {
          setEarlyDisconnect(true);
          toast.warning("Connection dropped. You can retry.");
        } else {
          setCallEnded(true);
          toast.info("Voice call ended");
        }
      }
    },
    onMessage: (message: any) => {
      console.log("EL onMessage", JSON.stringify(message));
      // Format 1: typed events
      if (message.type === "user_transcript") {
        const userText = message.user_transcription_event?.user_transcript;
        if (userText?.trim()) {
          addMessage({ role: "user", content: userText, timestamp: new Date().toISOString() });
        }
      } else if (message.type === "agent_response") {
        const agentText = message.agent_response_event?.agent_response;
        if (agentText?.trim()) {
          addMessage({ role: "assistant", content: agentText, timestamp: new Date().toISOString() });
        }
      }
      // Format 2: compact { role, message }
      else if (message.role && message.message) {
        const role = message.role === "user" ? "user" : "assistant";
        if (message.message.trim()) {
          addMessage({ role, content: message.message, timestamp: new Date().toISOString() });
        }
      }
    },
    onError: (error: any) => {
      console.error("EL onError", error);
      toast.error("Voice connection error. Please try again.");
      setIsConnecting(false);
      isStartingRef.current = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsConnecting(true);
    setCallEnded(false);
    setEarlyDisconnect(false);
    transcriptRef.current = [];
    setTranscript([]);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            include_prompt: true,
            interview_template: template,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Token request failed" }));
        throw new Error(err.error || "Failed to get signed URL");
      }

      const { signed_url, prompt: promptText } = await resp.json();
      if (!signed_url) throw new Error("No signed URL received");

      // Store prompt for contextual update after connection establishes
      pendingContextRef.current = promptText || "You are a brand strategist conducting an interview. Ask one question at a time.";

      // Hard connection timeout — fail after 12s if onConnect never fires
      connectionTimeoutRef.current = setTimeout(() => {
        if (isStartingRef.current || !hasStartedRef.current) {
          console.log("[VoiceCallPanel] Connection timeout — 12s elapsed");
          toast.error("Voice connection timed out. Please try again.");
          isStartingRef.current = false;
          setIsConnecting(false);
          try { conversation.endSession().catch(() => {}); } catch {}
        }
      }, 12000);

      // Minimal startSession — no overrides to avoid SDK disconnect bug
      await conversation.startSession({
        signedUrl: signed_url,
      });
    } catch (error: any) {
      console.error("Failed to start voice call:", error);
      isStartingRef.current = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (error.name === "NotAllowedError") {
        toast.error("Microphone access is required for voice calls. Please enable it in your browser settings.");
      } else {
        toast.error(error.message || "Failed to start voice call");
      }
      setIsConnecting(false);
    }
  }, [conversation, template]);

  const retryCall = useCallback(() => {
    retryCountRef.current += 1;
    hasStartedRef.current = false;
    startCall();
  }, [startCall]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
    if (transcriptRef.current.length > 0) {
      onCallEnd(transcriptRef.current);
    } else {
      onCancel();
    }
  }, [conversation, onCallEnd, onCancel]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;
  const contextCount = existingMessages.length;

  // Early disconnect — offer retry
  if (earlyDisconnect) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <PhoneOff className="h-9 w-9 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-medium">Connection dropped</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            The call disconnected early. This can happen with unstable connections. Try again?
          </p>
        </div>
        <Button onClick={retryCall} size="sm" className="gap-1.5 mt-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Retry Voice Call
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
          Back to Chat
        </Button>
      </div>
    );
  }

  // Call ended screen
  if (callEnded) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Call ended</span>
          </div>
        </div>
        {transcript.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card className={cn("max-w-[85%] px-3 py-2 text-xs", msg.role === "user" ? "bg-primary text-primary-foreground border-0" : "bg-background")}>
                  {msg.content}
                </Card>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 border-t flex justify-center">
          <Button
            size="sm"
            onClick={() => {
              if (transcriptRef.current.length > 0) {
                onCallEnd(transcriptRef.current);
              } else {
                onCancel();
              }
            }}
            className="gap-1.5"
          >
            Return to Chat
          </Button>
        </div>
      </div>
    );
  }

  // Pre-call screen
  if (!hasStartedRef.current && !isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="h-9 w-9 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Voice Interview</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            {contextCount > 0
              ? `Continuing interview with ${contextCount} prior messages for context.`
              : "Have a natural conversation with the AI brand strategist. Your microphone will be used."}
          </p>
        </div>
        <Button onClick={startCall} size="sm" className="gap-1.5 mt-2">
          <Phone className="h-3.5 w-3.5" />
          {contextCount > 0 ? "Continue with Voice" : "Start Voice Call"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Call status header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isConnecting && "bg-accent animate-pulse",
              isConnected && !isSpeaking && "bg-primary",
              isConnected && isSpeaking && "bg-primary animate-pulse"
            )}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {isConnecting
              ? "Connecting..."
              : isSpeaking
              ? "AI is speaking..."
              : "Listening..."}
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={endCall}
          className="gap-1.5 h-7 text-xs"
        >
          <PhoneOff className="h-3 w-3" />
          End Call
        </Button>
      </div>

      {/* Voice visualization */}
      <div className="flex items-center justify-center py-8">
        <div className="relative">
          <div
            className={cn(
              "h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300",
              isConnecting && "bg-muted",
              isConnected && !isSpeaking && "bg-accent",
              isConnected && isSpeaking && "bg-primary/20 scale-110"
            )}
          >
            {isConnecting ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Mic
                className={cn(
                  "h-8 w-8 transition-colors",
                  isSpeaking ? "text-primary" : "text-foreground"
                )}
              />
            )}
          </div>
          {isConnected && isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-primary/5 animate-pulse" />
            </>
          )}
        </div>
      </div>

      {/* Live transcript */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {transcript.length === 0 && isConnected && (
          <p className="text-xs text-muted-foreground text-center">
            The conversation will be transcribed here...
          </p>
        )}
        {transcript.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={cn(
                "max-w-[85%] px-3 py-2 text-xs",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground border-0"
                  : "bg-background"
              )}
            >
              {msg.content}
            </Card>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
