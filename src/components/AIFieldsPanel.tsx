import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown } from "lucide-react";
import { useState } from "react";

interface AIFields {
  agent_status?: string | null;
  agent_confidence?: number | null;
  ai_summary?: string | null;
  ai_suggested_client?: string | null;
  ai_suggested_content_type?: string | null;
  ai_suggested_priority?: string | null;
  ai_suggested_assignee?: string | null;
  ai_suggested_project?: string | null;
  ai_suggested_subproject?: string | null;
  ai_suggested_next_action?: string | null;
  ai_suggested_item_type?: string | null;
  source_type?: string | null;
  raw_input_text?: string | null;
  voice_transcript?: string | null;
}

const agentStatusColors: Record<string, string> = {
  pending_ai_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ai_processed: "bg-blue-100 text-blue-800 border-blue-300",
  needs_human_review: "bg-orange-100 text-orange-800 border-orange-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

export default function AIFieldsPanel({ fields }: { fields: AIFields }) {
  const [open, setOpen] = useState(false);

  const hasAnyField = fields.ai_summary || fields.agent_status || fields.ai_suggested_client ||
    fields.ai_suggested_content_type || fields.ai_suggested_priority || fields.ai_suggested_assignee ||
    fields.ai_suggested_project || fields.ai_suggested_next_action || fields.agent_confidence != null ||
    fields.source_type || fields.raw_input_text || fields.voice_transcript;

  if (!hasAnyField) return null;

  const rows: { label: string; value: string | number }[] = [];
  if (fields.ai_summary) rows.push({ label: "AI Summary", value: fields.ai_summary });
  if (fields.ai_suggested_client) rows.push({ label: "Suggested Client", value: fields.ai_suggested_client });
  if (fields.ai_suggested_content_type) rows.push({ label: "Suggested Content Type", value: fields.ai_suggested_content_type });
  if (fields.ai_suggested_priority) rows.push({ label: "Suggested Priority", value: fields.ai_suggested_priority });
  if (fields.ai_suggested_assignee) rows.push({ label: "Suggested Assignee", value: fields.ai_suggested_assignee });
  if (fields.ai_suggested_project) rows.push({ label: "Suggested Project", value: fields.ai_suggested_project });
  if (fields.ai_suggested_subproject) rows.push({ label: "Suggested Subproject", value: fields.ai_suggested_subproject });
  if (fields.ai_suggested_next_action) rows.push({ label: "Suggested Next Action", value: fields.ai_suggested_next_action });
  if (fields.ai_suggested_item_type) rows.push({ label: "Suggested Item Type", value: fields.ai_suggested_item_type });
  if (fields.agent_confidence != null) rows.push({ label: "Confidence Score", value: `${Math.round(fields.agent_confidence * 100)}%` });
  if (fields.source_type) rows.push({ label: "Source", value: fields.source_type });
  if (fields.voice_transcript) rows.push({ label: "Voice Transcript", value: fields.voice_transcript });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
        <Bot className="h-4 w-4 text-primary" />
        <span>AI Intake</span>
        {fields.agent_status && (
          <Badge variant="outline" className={`text-[10px] ml-1 ${agentStatusColors[fields.agent_status] || ""}`}>
            {fields.agent_status.replace(/_/g, " ")}
          </Badge>
        )}
        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-muted-foreground text-xs font-medium">{r.label}</span>
              <span className="text-foreground">{r.value}</span>
            </div>
          ))}
          {fields.raw_input_text && (
            <div>
              <span className="text-muted-foreground text-xs font-medium block mb-1">Raw Input</span>
              <p className="text-xs bg-muted/40 rounded p-2 whitespace-pre-wrap">{fields.raw_input_text}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
