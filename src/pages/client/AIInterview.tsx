import { useAuth } from "@/contexts/AuthContext";
import InterviewTab from "@/components/brain/InterviewTab";
import { EmptyState } from "@/components/ui/empty-state";
import { Brain } from "lucide-react";

export default function AIInterview() {
  const { profile } = useAuth();
  const clientId = profile?.client_id;

  if (!clientId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Brain className="h-10 w-10" />}
          title="No client linked"
          description="Your account isn't linked to a client yet. Contact Stay Social for help."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">AI Interview</h1>
        <p className="text-sm text-muted-foreground">Chat or call our AI brand strategist to build your Brand Twin.</p>
      </div>
      <InterviewTab clientId={clientId} />
    </div>
  );
}
