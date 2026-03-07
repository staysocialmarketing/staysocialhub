import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Target } from "lucide-react";
import { useState } from "react";

interface StrategyBrief {
  objective?: string;
  audience?: string;
  angle?: string;
  hook?: string;
  cta?: string;
  recommended_format?: string;
  production_notes?: string;
  subject_lines?: string;
  preview_text?: string;
  script_draft?: string;
}

export default function StrategyBriefPanel({ brief }: { brief: StrategyBrief | null | undefined }) {
  const [open, setOpen] = useState(false);

  if (!brief || typeof brief !== "object") return null;

  const fields: { label: string; key: keyof StrategyBrief }[] = [
    { label: "Objective", key: "objective" },
    { label: "Audience", key: "audience" },
    { label: "Angle", key: "angle" },
    { label: "Hook", key: "hook" },
    { label: "CTA", key: "cta" },
    { label: "Recommended Format", key: "recommended_format" },
    { label: "Production Notes", key: "production_notes" },
    { label: "Subject Lines", key: "subject_lines" },
    { label: "Preview Text", key: "preview_text" },
    { label: "Script Draft", key: "script_draft" },
  ];

  const populated = fields.filter((f) => brief[f.key]);
  if (populated.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
        <Target className="h-4 w-4 text-primary" />
        <span>Strategy Brief</span>
        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          {populated.map((f) => (
            <div key={f.key}>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</span>
              <p className="mt-0.5 text-foreground whitespace-pre-wrap">{brief[f.key]}</p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
