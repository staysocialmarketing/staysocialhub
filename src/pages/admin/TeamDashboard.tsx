import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Target, Trophy, TrendingUp, Award, Sparkles } from "lucide-react";

interface TeamSettings {
  monthly_revenue: number;
  next_milestone: number;
  bonus_pool: number;
}

export default function TeamDashboard() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [winsCount, setWinsCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: s } = await supabase.from("team_settings").select("*").limit(1).single();
      if (s) setSettings({ monthly_revenue: Number(s.monthly_revenue), next_milestone: Number(s.next_milestone), bonus_pool: Number(s.bonus_pool) });
      const { count } = await supabase.from("team_wins").select("*", { count: "exact", head: true });
      setWinsCount(count || 0);
    };
    fetchData();
  }, []);

  if (!settings) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const progress = settings.next_milestone > 0 ? Math.min((settings.monthly_revenue / settings.next_milestone) * 100, 100) : 0;
  const remaining = Math.max(settings.next_milestone - settings.monthly_revenue, 0);

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Team Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Company growth and team progress overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="Monthly Revenue"
          value={`$${settings.monthly_revenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => navigate("/admin/team/revenue")}
        />
        <StatCard
          label="Next Milestone"
          value={`$${settings.next_milestone.toLocaleString()}`}
          icon={<Target className="h-4 w-4" />}
          onClick={() => navigate("/admin/team/revenue")}
        />
        <StatCard
          label="Bonus Pool"
          value={`$${settings.bonus_pool.toLocaleString()}`}
          icon={<Trophy className="h-4 w-4" />}
          subtitle="Next milestone adds to pool"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="rounded-xl bg-card border border-border/40 shadow-sm p-5 space-y-3">
        <SectionHeader title="Revenue Progress" icon={<TrendingUp className="h-4 w-4" />} className="mb-0" />
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${settings.monthly_revenue.toLocaleString()} of ${settings.next_milestone.toLocaleString()}</span>
          <span>${remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl bg-card border border-border/40 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
          onClick={() => navigate("/admin/team/roles")}
        >
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Roles & Responsibilities</span>
          </div>
          <p className="text-xs text-muted-foreground">View team structure and missions.</p>
        </div>
        <div
          className="rounded-xl bg-card border border-border/40 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
          onClick={() => navigate("/admin/team/growth")}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Growth Tracks</span>
          </div>
          <p className="text-xs text-muted-foreground">Learning paths for the team.</p>
        </div>
        <div
          className="rounded-xl bg-card border border-border/40 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
          onClick={() => navigate("/admin/team/wins")}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Wins This Month</span>
          </div>
          <p className="text-xs text-muted-foreground">{winsCount} wins logged.</p>
        </div>
      </div>
    </div>
  );
}
