import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; timestamp?: string };

interface VoiceCallPanelProps {
  clientId: string;
  template: string;
  onCallEnd: (messages: Message[]) => void;
  onCancel: () => void;
}

export default function VoiceCallPanel({
  clientId,
  template,
  onCallEnd,
  onCancel,
}: VoiceCallPanelProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const transcriptRef = useRef<Message[]>([]);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      setHasStarted(true);
      setIsConnecting(false);
    },
    onDisconnect: () => {
      if (hasStarted && transcriptRef.current.length > 0) {
        onCallEnd(transcriptRef.current);
      }
    },
    onMessage: (message: any) => {
      if (message.type === "user_transcript") {
        const userText = message.user_transcription_event?.user_transcript;
        if (userText?.trim()) {
          const msg: Message = {
            role: "user",
            content: userText,
            timestamp: new Date().toISOString(),
          };
          transcriptRef.current = [...transcriptRef.current, msg];
          setTranscript([...transcriptRef.current]);
        }
      } else if (message.type === "agent_response") {
        const agentText = message.agent_response_event?.agent_response;
        if (agentText?.trim()) {
          const msg: Message = {
            role: "assistant",
            content: agentText,
            timestamp: new Date().toISOString(),
          };
          transcriptRef.current = [...transcriptRef.current, msg];
          setTranscript([...transcriptRef.current]);
        }
      }
    },
    onError: (error: any) => {
      console.error("Voice conversation error:", error);
      toast.error("Voice connection error. Please try again.");
      setIsConnecting(false);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
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
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Token request failed" }));
        throw new Error(err.error || "Failed to get conversation token");
      }

      const { token: conversationToken } = await resp.json();
      if (!conversationToken) throw new Error("No token received");

      await conversation.startSession({
        conversationToken,
        connectionType: "webrtc",
      });
    } catch (error: any) {
      console.error("Failed to start voice call:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Microphone access is required for voice calls. Please enable it in your browser settings.");
      } else {
        toast.error(error.message || "Failed to start voice call");
      }
      setIsConnecting(false);
    }
  }, [conversation]);

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

  // Pre-call screen
  if (!hasStarted && !isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="h-9 w-9 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Voice Interview</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            Have a natural conversation with the AI brand strategist. Your microphone will be used.
          </p>
        </div>
        <Button onClick={startCall} size="sm" className="gap-1.5 mt-2">
          <Phone className="h-3.5 w-3.5" />
          Start Voice Call
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
        {(isConnected || isConnecting) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={endCall}
            className="gap-1.5 h-7 text-xs"
          >
            <PhoneOff className="h-3 w-3" />
            End Call
          </Button>
        )}
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
