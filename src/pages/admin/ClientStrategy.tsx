import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, X, Target, Focus, Columns3, Megaphone, Video } from "lucide-react";

export default function ClientStrategy() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { isSSAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("id", clientId!).single();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: strategy, isLoading } = useQuery({
    queryKey: ["client-strategy", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_strategy")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const [goals, setGoals] = useState("");
  const [focus, setFocus] = useState("");
  const [pillars, setPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState("");
  const [campaigns, setCampaigns] = useState("");
  const [studioNotes, setStudioNotes] = useState({ persona_tone: "", video_instructions: "", scripting: "" });

  useEffect(() => {
    if (strategy) {
      const g = strategy.goals_json as any || {};
      const f = strategy.focus_json as any || {};
      const p = (strategy.pillars_json as any) || [];
      const c = strategy.campaigns_json as any || {};
      const s = strategy.studio_notes_json as any || {};
      setGoals(g.objectives || "");
      setFocus(f.weekly_focus || "");
      setPillars(Array.isArray(p) ? p : []);
      setCampaigns(typeof c === "string" ? c : c.notes || "");
      setStudioNotes({
        persona_tone: s.persona_tone || "",
        video_instructions: s.video_instructions || "",
        scripting: s.scripting || "",
      });
    }
  }, [strategy]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId!,
        goals_json: { objectives: goals },
        focus_json: { weekly_focus: focus },
        pillars_json: pillars as any,
        campaigns_json: { notes: campaigns },
        studio_notes_json: studioNotes,
      };
      if (strategy) {
        const { error } = await supabase.from("client_strategy").update(payload).eq("client_id", clientId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_strategy").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-strategy", clientId] });
      toast.success("Strategy saved");
    },
    onError: () => toast.error("Failed to save strategy"),
  });

  const addPillar = () => {
    if (newPillar.trim()) {
      setPillars([...pillars, newPillar.trim()]);
      setNewPillar("");
    }
  };

  const removePillar = (idx: number) => {
    setPillars(pillars.filter((_, i) => i !== idx));
  };

  if (isLoading) return <div className="p-6"><p className="text-muted-foreground">Loading strategy...</p></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Strategy</h2>
          <p className="text-muted-foreground">{client?.name || "Client"}</p>
        </div>
      </div>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSSAdmin ? (
            <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Client marketing objectives..." rows={4} />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{goals || "—"}</p>
          )}
        </CardContent>
      </Card>

      {/* Current Focus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Focus className="h-4 w-4 text-primary" />Current Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSSAdmin ? (
            <Textarea value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="This week's focus and direction..." rows={3} />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{focus || "—"}</p>
          )}
        </CardContent>
      </Card>

      {/* Content Pillars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Columns3 className="h-4 w-4 text-primary" />Content Pillars
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {pillars.map((p, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-sm">
                {p}
                {isSSAdmin && (
                  <button onClick={() => removePillar(i)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {pillars.length === 0 && <p className="text-sm text-muted-foreground">No pillars defined yet.</p>}
          </div>
          {isSSAdmin && (
            <div className="flex gap-2">
              <Input value={newPillar} onChange={(e) => setNewPillar(e.target.value)} placeholder="Add a pillar..." onKeyDown={(e) => e.key === "Enter" && addPillar()} />
              <Button variant="outline" size="icon" onClick={addPillar}><Plus className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" />Campaign Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSSAdmin ? (
            <Textarea value={campaigns} onChange={(e) => setCampaigns(e.target.value)} placeholder="Current marketing campaigns..." rows={4} />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{campaigns || "—"}</p>
          )}
        </CardContent>
      </Card>

      {/* Studio / AI Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4 text-primary" />Studio / AI Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs">AI Persona Tone</Label>
            {isSSAdmin ? (
              <Textarea value={studioNotes.persona_tone} onChange={(e) => setStudioNotes({ ...studioNotes, persona_tone: e.target.value })} placeholder="Tone guidance for AI persona..." rows={2} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{studioNotes.persona_tone || "—"}</p>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Video Instructions</Label>
            {isSSAdmin ? (
              <Textarea value={studioNotes.video_instructions} onChange={(e) => setStudioNotes({ ...studioNotes, video_instructions: e.target.value })} placeholder="Video content instructions..." rows={2} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{studioNotes.video_instructions || "—"}</p>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Scripting Guidance</Label>
            {isSSAdmin ? (
              <Textarea value={studioNotes.scripting} onChange={(e) => setStudioNotes({ ...studioNotes, scripting: e.target.value })} placeholder="Scripting guidance..." rows={2} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{studioNotes.scripting || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isSSAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />Save Strategy
          </Button>
        </div>
      )}
    </div>
  );
}
