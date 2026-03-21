import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, MessageSquare, PenLine, PartyPopper, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  userId: string;
}

export default function ClientOnboardingWizard({ open, onClose, clientId, clientName, userId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [captureText, setCaptureText] = useState("");

  const saveCapture = useMutation({
    mutationFn: async () => {
      if (!captureText.trim()) return;
      const { error } = await supabase.from("brain_captures").insert({
        client_id: clientId,
        created_by_user_id: userId,
        content: captureText.trim(),
        type: "note",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-captures"] });
      toast.success("Your first idea has been saved!");
      setStep(3);
    },
    onError: () => toast.error("Failed to save capture"),
  });

  const finishWizard = async () => {
    // Mark wizard complete
    const { data: existing } = await supabase
      .from("client_success_extras")
      .select("client_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("client_success_extras")
        .update({ updated_at: new Date().toISOString() })
        .eq("client_id", clientId);
    } else {
      await supabase
        .from("client_success_extras")
        .insert({ client_id: clientId });
    }
    onClose();
  };

  const steps = [
    // Step 0: Welcome
    {
      icon: <Sparkles className="h-10 w-10 text-primary" />,
      title: `Welcome to Stay Social HUB, ${clientName}!`,
      body: "We're excited to have you. Let's get you set up in just a couple of quick steps so we can start creating amazing content together.",
      action: (
        <Button className="w-full gap-2" onClick={() => setStep(1)}>
          Let's Go <ArrowRight className="h-4 w-4" />
        </Button>
      ),
    },
    // Step 1: Brand Voice
    {
      icon: <MessageSquare className="h-10 w-10 text-primary" />,
      title: "Tell Us About Your Brand",
      body: "The quickest way to get started is with our AI Interview. It takes about 5 minutes and helps us understand your voice, audience, and goals.",
      action: (
        <div className="space-y-2 w-full">
          <Button className="w-full gap-2" onClick={() => { navigate("/client/interview"); onClose(); }}>
            Start AI Interview <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => setStep(2)}>
            Skip for now
          </Button>
        </div>
      ),
    },
    // Step 2: First Capture
    {
      icon: <PenLine className="h-10 w-10 text-primary" />,
      title: "Drop Your First Idea",
      body: "Got a content idea, promotion, or thought? Jot it down here and we'll add it to your brain — your creative idea bank.",
      action: (
        <div className="space-y-3 w-full">
          <Textarea
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            placeholder="e.g. Post about our new spring collection launch..."
            rows={3}
            className="rounded-xl"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => saveCapture.mutate()}
              disabled={!captureText.trim() || saveCapture.isPending}
            >
              {saveCapture.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Save & Continue
            </Button>
            <Button variant="ghost" className="text-sm text-muted-foreground" onClick={() => setStep(3)}>
              Skip
            </Button>
          </div>
        </div>
      ),
    },
    // Step 3: Done
    {
      icon: <PartyPopper className="h-10 w-10 text-primary" />,
      title: "You're All Set!",
      body: "Your Success Center is your home base. From here you can track progress, submit requests, and see what we're working on for you.",
      action: (
        <Button className="w-full gap-2" onClick={finishWizard}>
          Go to My Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finishWizard(); }}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          {current.icon}
          <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          {current.action}
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
