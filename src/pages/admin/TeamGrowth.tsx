import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Trash2, GraduationCap } from "lucide-react";

interface GrowthTrack {
  id: string;
  user_name: string;
  track_name: string;
  sort_order: number;
}

export default function TeamGrowth() {
  const { isSSAdmin } = useAuth();
  const [tracks, setTracks] = useState<GrowthTrack[]>([]);
  const [newTrack, setNewTrack] = useState({ user_name: "", track_name: "" });

  const fetchTracks = async () => {
    const { data } = await supabase.from("team_growth_tracks").select("*").order("user_name").order("sort_order");
    if (data) setTracks(data);
  };

  useEffect(() => { fetchTracks(); }, []);

  const grouped = tracks.reduce<Record<string, GrowthTrack[]>>((acc, t) => {
    (acc[t.user_name] = acc[t.user_name] || []).push(t);
    return acc;
  }, {});

  const addTrack = async () => {
    if (!newTrack.user_name.trim() || !newTrack.track_name.trim()) return;
    const maxOrder = tracks.filter(t => t.user_name === newTrack.user_name).length;
    const { error } = await supabase.from("team_growth_tracks").insert({
      user_name: newTrack.user_name.trim(),
      track_name: newTrack.track_name.trim(),
      sort_order: maxOrder,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTrack({ user_name: "", track_name: "" });
    fetchTracks();
  };

  const deleteTrack = async (id: string) => {
    await supabase.from("team_growth_tracks").delete().eq("id", id);
    fetchTracks();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Growth Tracks</h1>
        <p className="text-sm text-muted-foreground mt-1">Learning paths for team members.</p>
      </div>

      {isSSAdmin && (
        <div className="rounded-xl bg-card border border-border/40 shadow-sm p-4 space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Track</span>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Team member name" value={newTrack.user_name} onChange={e => setNewTrack(f => ({ ...f, user_name: e.target.value }))} className="w-40" />
            <Input placeholder="Track name" value={newTrack.track_name} onChange={e => setNewTrack(f => ({ ...f, track_name: e.target.value }))} className="flex-1 min-w-[160px]" />
            <Button size="sm" onClick={addTrack}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-8 w-8" />} title="No growth tracks yet" />
      ) : (
        Object.entries(grouped).map(([name, items]) => (
          <div key={name} className="rounded-xl bg-card border border-border/40 shadow-sm p-5 space-y-3">
            <SectionHeader title={`${name}'s Growth Track`} icon={<TrendingUp className="h-4 w-4" />} className="mb-0" />
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                    <span className="text-foreground">{item.track_name}</span>
                  </div>
                  {isSSAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTrack(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
