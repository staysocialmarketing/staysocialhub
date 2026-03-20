import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";

export default function ContentGenerator() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Content Generator</h1>
        <p className="text-sm text-muted-foreground">AI-powered content creation tailored to your brand.</p>
      </div>
      <EmptyState
        icon={<Sparkles className="h-10 w-10" />}
        title="Coming Soon"
        description="Generate on-brand captions, emails, and content ideas powered by your Brand Twin. Stay tuned!"
      />
    </div>
  );
}
