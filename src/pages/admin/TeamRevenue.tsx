import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/ui/section-header";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Save, TrendingUp } from "lucide-react";

export default function TeamRevenue() {
  const { isSSAdmin } = useAuth();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [milestone, setMilestone] = useState(0);
  const [bonusPool, setBonusPool] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("team_settings").select("*").limit(1).single();
      if (data) {
        setSettingsId(data.id);
        setRevenue(Number(data.monthly_revenue));
        setMilestone(Number(data.next_milestone));
        setBonusPool(Number(data.bonus_pool));
      }
    };
    fetch();
  }, []);

  const progress = milestone > 0 ? Math.min((revenue / milestone) * 100, 100) : 0;
  const remaining = Math.max(milestone - revenue, 0);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("team_settings").update({
      monthly_revenue: revenue,
      next_milestone: milestone,
      bonus_pool: bonusPool,
      updated_at: new Date().toISOString(),
    }).eq("id", settingsId);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Revenue settings saved" });
  };

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Revenue Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Track company growth milestones.</p>
      </div>

      <div className="rounded-2xl bg-card shadow-soft p-5 space-y-4">
        <SectionHeader title="Progress to Milestone" icon={<TrendingUp className="h-4 w-4" />} className="mb-0" />
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${revenue.toLocaleString()} of ${milestone.toLocaleString()}</span>
          <span>${remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      {isSSAdmin ? (
        <div className="rounded-2xl bg-card shadow-soft p-5 space-y-4">
          <SectionHeader title="Edit Revenue Settings" icon={<DollarSign className="h-4 w-4" />} className="mb-0" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Monthly Revenue</Label>
              <Input type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Milestone</Label>
              <Input type="number" value={milestone} onChange={e => setMilestone(Number(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bonus Pool</Label>
              <Input type="number" value={bonusPool} onChange={e => setBonusPool(Number(e.target.value))} className="rounded-xl" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-card shadow-soft p-5 space-y-2">
          <SectionHeader title="Revenue Details" icon={<DollarSign className="h-4 w-4" />} className="mb-0" />
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div><span className="text-muted-foreground">Monthly Revenue:</span> <span className="font-semibold">${revenue.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Next Milestone:</span> <span className="font-semibold">${milestone.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Bonus Pool:</span> <span className="font-semibold">${bonusPool.toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}