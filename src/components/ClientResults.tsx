import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Eye, MousePointerClick, Users } from "lucide-react";

interface Props {
  clientId: string;
}

export default function ClientResults({ clientId }: Props) {
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["content-metrics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_metrics")
        .select("*, posts(title)")
        .eq("client_id", clientId)
        .order("reported_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading results...</p>;
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No performance data yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Results will appear here once your content starts performing.</p>
      </div>
    );
  }

  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const totalReach = metrics.reduce((s, m) => s + (m.reach || 0), 0);
  const totalEngagement = metrics.reduce((s, m) => s + (m.engagement || 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const avgEngRate = totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : "0";

  // Group by reported_at for trend chart
  const trendMap = new Map<string, { date: string; impressions: number; engagement: number; clicks: number }>();
  metrics.forEach((m) => {
    const key = m.reported_at;
    const existing = trendMap.get(key) || { date: key, impressions: 0, engagement: 0, clicks: 0 };
    existing.impressions += m.impressions || 0;
    existing.engagement += m.engagement || 0;
    existing.clicks += m.clicks || 0;
    trendMap.set(key, existing);
  });
  const trendData = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Top posts by engagement
  const topPosts = [...metrics]
    .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))
    .slice(0, 5)
    .map((m) => ({
      title: (m as any).posts?.title || "Untitled",
      engagement: m.engagement || 0,
    }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Impressions" value={totalImpressions.toLocaleString()} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Total Reach" value={totalReach.toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Engagement Rate" value={`${avgEngRate}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} icon={<MousePointerClick className="h-4 w-4" />} />
      </div>

      {/* Engagement trend */}
      {trendData.length > 1 && (
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-4">Engagement Over Time</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip />
              <Line type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-4">Top Performing Content</h4>
          <ResponsiveContainer width="100%" height={topPosts.length * 40 + 20}>
            <BarChart data={topPosts} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
