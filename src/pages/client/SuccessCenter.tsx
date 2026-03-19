import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Focus,
  Megaphone,
  Trophy,
  CalendarClock,
  CreditCard,
  Zap,
  ArrowRight,
  Plus,
  X,
  Save,
  MessageSquarePlus,
  CheckSquare,
  FolderOpen,
  Phone,
  Pencil,
  Activity,
  Columns3,
} from "lucide-react";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { AddActivityDialog } from "@/components/activity/AddActivityDialog";
import { OnboardingTracker } from "@/components/OnboardingTracker";
import { getWaveEmoji } from "@/lib/waveEmoji";

export default function SuccessCenter() {
  const navigate = useNavigate();
  const { profile, isSSRole } = useAuth();
  const queryClient = useQueryClient();

  const clientId = profile?.client_id;

  const { data: clientData } = useQuery({
    queryKey: ["success-client", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, plan_id, recommended_item_id, plans(name), marketplace_items(name, description, icon)")
        .eq("id", clientId!)
        .single();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: strategy } = useQuery({
    queryKey: ["success-strategy", clientId],
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

  const { data: extras } = useQuery({
    queryKey: ["success-extras", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_success_extras")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data as {
        client_id: string;
        recent_wins: string[];
        coming_up_next: string[];
        focus_override: string | null;
        recommended_next_step: string | null;
        updated_at: string;
      } | null;
    },
    enabled: !!clientId,
  });

  const [activityLimit, setActivityLimit] = useState(10);
  const { data: activities = [] } = useQuery({
    queryKey: ["client-activity", clientId, activityLimit],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_activity")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(activityLimit);
      return (data || []) as Array<{
        id: string;
        activity_type: string;
        title: string;
        description: string | null;
        created_at: string;
        visible_to_client: boolean;
      }>;
    },
    enabled: !!clientId,
  });

  const strategyData = strategy as any;
  const focusText = extras?.focus_override || (strategyData?.focus_json as any)?.weekly_focus || "";
  const goalsText: string = (strategyData?.goals_json as any)?.objectives || "";
  const goalsList = goalsText.split("\n").filter((g: string) => g.trim());
  const campaignsText: string = typeof strategyData?.campaigns_json === "string"
    ? strategyData.campaigns_json
    : (strategyData?.campaigns_json as any)?.notes || "";
  const prioritiesList = campaignsText.split("\n").filter((c: string) => c.trim());
  const recentWins: string[] = (extras?.recent_wins as any) || [];
  const comingUpNext: string[] = (extras?.coming_up_next as any) || [];
  const planName = (clientData as any)?.plans?.name || null;
  const recommendedItem = (clientData as any)?.marketplace_items || null;
  const recommendedStep = extras?.recommended_next_step || (recommendedItem ? `Add ${recommendedItem.name}` : null);
  const lastUpdated = extras?.updated_at || strategy?.updated_at || null;

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFocus, setEditFocus] = useState("");
  const [editWins, setEditWins] = useState<string[]>([]);
  const [editUpcoming, setEditUpcoming] = useState<string[]>([]);
  const [editRecommended, setEditRecommended] = useState("");
  const [newItem, setNewItem] = useState("");

  const startEdit = (section: string) => {
    if (section === "focus") setEditFocus(extras?.focus_override || focusText);
    if (section === "wins") setEditWins([...recentWins]);
    if (section === "upcoming") setEditUpcoming([...comingUpNext]);
    if (section === "recommended") setEditRecommended(extras?.recommended_next_step || "");
    setEditingSection(section);
    setNewItem("");
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const existing = extras;
      if (existing) {
        const { error } = await supabase
          .from("client_success_extras")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("client_id", clientId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_success_extras")
          .insert({ client_id: clientId!, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["success-extras", clientId] });
      setEditingSection(null);
      toast.success("Saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const saveFocus = () => saveMutation.mutate({ focus_override: editFocus || null });
  const saveWins = () => saveMutation.mutate({ recent_wins: editWins });
  const saveUpcoming = () => saveMutation.mutate({ coming_up_next: editUpcoming });
  const saveRecommended = () => saveMutation.mutate({ recommended_next_step: editRecommended || null });

  const addToList = (list: string[], setList: (v: string[]) => void) => {
    if (newItem.trim()) {
      setList([...list, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeFromList = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const EditButton = ({ section }: { section: string }) =>
    isSSRole && editingSection !== section ? (
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 rounded-xl" onClick={() => startEdit(section)}>
        <Pencil className="h-3 w-3" /> Edit
      </Button>
    ) : null;

  const SaveCancelButtons = ({ onSave }: { onSave: () => void }) => (
    <div className="flex gap-2 mt-3">
      <Button size="sm" className="rounded-xl" onClick={onSave} disabled={saveMutation.isPending}>
        <Save className="h-3 w-3 mr-1" /> Save
      </Button>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditingSection(null)}>Cancel</Button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* 1. HERO — warm, borderless */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-background to-accent/5 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">
          Welcome back, {clientData?.name || profile?.name || "there"} {getWaveEmoji(profile?.name)}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Here's what we're focused on right now and what's coming next in your Stay Social System.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {planName && (
            <Badge variant="secondary" className="text-[11px] rounded-full">
              <CreditCard className="h-3 w-3 mr-1" /> {planName}
            </Badge>
          )}
          {lastUpdated && (
            <Badge variant="outline" className="text-[11px] text-muted-foreground rounded-full">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* ONBOARDING PROGRESS */}
      {clientId && (
        <div className="card-elevated p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <CheckSquare className="h-4 w-4 text-primary" /> Onboarding Progress
          </h3>
          <OnboardingTracker clientId={clientId} isAdmin={false} compact />
        </div>
      )}

      {/* STRATEGY HIGHLIGHTS */}
      {(() => {
        const vs = (strategyData?.visible_sections as any) || {};
        const hasGoals = vs.goals && goalsText.trim();
        const hasFocus = vs.focus && focusText.trim();
        const hasPillars = vs.pillars && Array.isArray(strategyData?.pillars_json) && (strategyData.pillars_json as any[]).length > 0;
        const hasCampaigns = vs.campaigns && campaignsText.trim();
        const hasAny = hasGoals || hasFocus || hasPillars || hasCampaigns;
        if (!hasAny) return null;
        return (
          <div className="card-elevated p-5 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Strategy Highlights
            </h3>
            {hasFocus && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Focus className="h-3 w-3" /> Current Focus</p>
                <p className="text-sm whitespace-pre-wrap">{focusText}</p>
              </div>
            )}
            {hasGoals && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Goals</p>
                <ul className="space-y-1">
                  {goalsList.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasPillars && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Columns3 className="h-3 w-3" /> Content Pillars</p>
                <div className="flex flex-wrap gap-1.5">
                  {(strategyData.pillars_json as string[]).map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs rounded-full">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {hasCampaigns && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Megaphone className="h-3 w-3" /> Campaigns</p>
                <ul className="space-y-1">
                  {prioritiesList.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-foreground/30 shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. CURRENT FOCUS */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Focus className="h-4 w-4 text-primary" /> Current Focus
          </h3>
          <EditButton section="focus" />
        </div>
        {editingSection === "focus" ? (
          <>
            <Textarea className="rounded-xl" value={editFocus} onChange={(e) => setEditFocus(e.target.value)} rows={3} placeholder="What we're focused on this week..." />
            <SaveCancelButtons onSave={saveFocus} />
          </>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{focusText || <span className="text-muted-foreground italic">No focus set yet.</span>}</p>
        )}
      </div>

      {/* 3. GOALS */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Target className="h-4 w-4 text-primary" /> Goals
        </h3>
        {goalsList.length > 0 ? (
          <ul className="space-y-2">
            {goalsList.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No goals defined yet.</p>
        )}
      </div>

      {/* 4. ACTIVE PRIORITIES */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Megaphone className="h-4 w-4 text-primary" /> Active Priorities
        </h3>
        {prioritiesList.length > 0 ? (
          <ul className="space-y-2">
            {prioritiesList.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-foreground/30 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No active priorities yet.</p>
        )}
      </div>

      {/* 5. RECENT WINS */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-primary" /> Recent Wins
          </h3>
          <EditButton section="wins" />
        </div>
        {editingSection === "wins" ? (
          <>
            <div className="space-y-2">
              {editWins.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{w}</span>
                  <button onClick={() => removeFromList(editWins, setEditWins, i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input className="rounded-xl" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a win..." onKeyDown={(e) => e.key === "Enter" && addToList(editWins, setEditWins)} />
              <Button variant="outline" size="icon" className="rounded-xl" onClick={() => addToList(editWins, setEditWins)}><Plus className="h-4 w-4" /></Button>
            </div>
            <SaveCancelButtons onSave={saveWins} />
          </>
        ) : recentWins.length > 0 ? (
          <ul className="space-y-2">
            {recentWins.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span> {w}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No recent wins yet.</p>
        )}
      </div>

      {/* 5b. ACTIVITY TIMELINE */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </h3>
          {isSSRole && clientId && <AddActivityDialog clientId={clientId} />}
        </div>
        <ActivityTimeline
          activities={activities}
          isSSRole={!!isSSRole}
          hasMore={activities.length === activityLimit}
          onLoadMore={() => setActivityLimit((l) => l + 10)}
        />
      </div>

      {/* 6. COMING UP NEXT */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" /> Coming Up Next
          </h3>
          <EditButton section="upcoming" />
        </div>
        {editingSection === "upcoming" ? (
          <>
            <div className="space-y-2">
              {editUpcoming.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{u}</span>
                  <button onClick={() => removeFromList(editUpcoming, setEditUpcoming, i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input className="rounded-xl" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add upcoming item..." onKeyDown={(e) => e.key === "Enter" && addToList(editUpcoming, setEditUpcoming)} />
              <Button variant="outline" size="icon" className="rounded-xl" onClick={() => addToList(editUpcoming, setEditUpcoming)}><Plus className="h-4 w-4" /></Button>
            </div>
            <SaveCancelButtons onSave={saveUpcoming} />
          </>
        ) : comingUpNext.length > 0 ? (
          <ul className="space-y-2">
            {comingUpNext.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" /> {u}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Nothing scheduled yet.</p>
        )}
      </div>

      {/* 7. YOUR PLAN */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-primary" /> Your Plan
          </h3>
          <EditButton section="recommended" />
        </div>
        <div className="space-y-4">
          {planName ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1 rounded-full">{planName}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No plan assigned.</p>
          )}

          {editingSection === "recommended" ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recommended Next Step</p>
                <Input className="rounded-xl" value={editRecommended} onChange={(e) => setEditRecommended(e.target.value)} placeholder="e.g. Add Lead Capture" />
              </div>
              <SaveCancelButtons onSave={saveRecommended} />
            </>
          ) : recommendedStep ? (
            <div className="rounded-xl bg-accent/30 p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Recommended Next Step</p>
                <p className="text-sm text-muted-foreground">{recommendedStep}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 8. QUICK ACTIONS — large tappable cards */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Zap className="h-4 w-4 text-primary" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: MessageSquarePlus, label: "Submit a Request", to: "/requests" },
            { icon: CheckSquare, label: "View Approvals", to: "/approvals" },
            { icon: FolderOpen, label: "View My Media", to: "/content-library" },
            { icon: Phone, label: "Book a Call", to: "https://calendly.com", external: true },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => action.external ? window.open(action.to, "_blank") : navigate(action.to)}
              className="card-elevated p-4 flex flex-col items-center gap-2 hover:shadow-lifted transition-all group cursor-pointer"
            >
              <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 9. PLATFORM UPDATES */}
      <div className="card-elevated p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Platform Updates</p>
            <p className="text-xs text-muted-foreground">See what's new in the Stay Social HUB.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 rounded-xl" onClick={() => navigate("/whats-new")}>
          View Updates <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
