import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Plus, Trash2, Trophy } from "lucide-react";
import { format } from "date-fns";

interface Win {
  id: string;
  title: string;
  created_at: string;
}

export default function TeamWins() {
  const { isSSAdmin, profile } = useAuth();
  const [wins, setWins] = useState<Win[]>([]);
  const [newWin, setNewWin] = useState("");

  const fetchWins = async () => {
    const { data } = await supabase.from("team_wins").select("*").order("created_at", { ascending: false });
    if (data) setWins(data);
  };

  useEffect(() => { fetchWins(); }, []);

  const addWin = async () => {
    if (!newWin.trim() || !profile) return;
    const { error } = await supabase.from("team_wins").insert({ title: newWin.trim(), created_by_user_id: profile.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewWin("");
    fetchWins();
  };

  const deleteWin = async (id: string) => {
    await supabase.from("team_wins").delete().eq("id", id);
    fetchWins();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Wins This Month</h1>
        <p className="text-sm text-muted-foreground mt-1">Celebrate team progress and achievements.</p>
      </div>

      {isSSAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="Add a win..."
            value={newWin}
            onChange={e => setNewWin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addWin()}
            className="flex-1 rounded-xl"
          />
          <Button size="sm" onClick={addWin}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
      )}

      {wins.length === 0 ? (
        <EmptyState icon={<Trophy className="h-8 w-8" />} title="No wins logged yet" description="Add team achievements to keep momentum going." />
      ) : (
        <div className="rounded-2xl bg-card shadow-soft divide-y divide-border/30">
          {wins.map(win => (
            <div key={win.id} className="px-5 py-4 flex items-center justify-between group hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{win.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(win.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              {isSSAdmin && (
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" onClick={() => deleteWin(win.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}