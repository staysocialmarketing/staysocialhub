import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Target, Sparkles, Save, Loader2 } from "lucide-react";

interface StrategyBrief {
  objective?: string;
  angle?: string;
  primary_message?: string;
  audience?: string;
  campaign?: string;
  cta?: string;
  production_notes?: string;
}

const FIELDS: { label: string; key: keyof StrategyBrief }[] = [
  { label: "Strategic Objective", key: "objective" },
  { label: "Content Angle", key: "angle" },
  { label: "Primary Message", key: "primary_message" },
  { label: "Target Audience", key: "audience" },
  { label: "Campaign / Initiative", key: "campaign" },
  { label: "Call To Action", key: "cta" },
  { label: "Production Notes", key: "production_notes" },
];

interface StrategyEditPanelProps {
  requestId: string;
  brief: StrategyBrief | null | undefined;
}

export default function StrategyEditPanel({ requestId, brief }: StrategyEditPanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StrategyBrief>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const safeBrief = brief && typeof brief === "object" ? brief : {};
    setForm({
      objective: safeBrief.objective || "",
      angle: safeBrief.angle || "",
      primary_message: safeBrief.primary_message || "",
      audience: safeBrief.audience || "",
      campaign: safeBrief.campaign || "",
      cta: safeBrief.cta || "",
      production_notes: safeBrief.production_notes || "",
    });
    setDirty(false);
  }, [brief]);

  const updateField = (key: keyof StrategyBrief, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-strategy", {
        body: { request_id: requestId },
      });
      if (error) throw error;
      if (data?.brief) {
        setForm(data.brief);
        setDirty(false);
        queryClient.invalidateQueries({ queryKey: ["requests"] });
        toast.success("Strategy generated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate strategy");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ strategy_brief: form as any } as any)
        .eq("id", requestId);
      if (error) throw error;
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Strategy saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save strategy");
    } finally {
      setSaving(false);
    }
  };

  const hasContent = FIELDS.some((f) => form[f.key]?.trim());

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
        <Target className="h-4 w-4 text-primary" />
        <span>Strategy</span>
        {hasContent && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Ready</span>
        )}
        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Generate Strategy
            </Button>
            {dirty && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            )}
          </div>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</Label>
              <Textarea
                value={form[f.key] || ""}
                onChange={(e) => updateField(f.key, e.target.value)}
                rows={2}
                className="mt-1 text-sm"
                placeholder={`Enter ${f.label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
