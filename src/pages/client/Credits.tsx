import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Credits: video and character work runs on credits. Each Studio plan includes some every
 * month (spent first, no roll-over); packs never expire. Balance comes from credit_summary();
 * packs open Stripe payment links carrying the client id so the purchase lands here.
 */

// The generated Supabase types predate these tables; the repo casts in the same situation elsewhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Summary = {
  plan_name: string | null; monthly_credits: number; included: number; spent_this_month: number;
  included_left: number; purchased_left: number; balance: number; resets_on: string; auto_topup: boolean;
};
type Pack = { key: string; name: string; credits: number; price_cents: number; currency: string; payment_link_url: string | null; sort: number };
type Price = { key: string; name: string; description: string; credits: number; is_addon: boolean };
type Entry = { id: string; delta: number; kind: string; note: string | null; style_key: string | null; created_at: string; posts?: { title: string } | null };

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`;
const KIND_LABEL: Record<string, string> = { plan_grant: "Plan", purchase: "Purchase", spend: "Video", adjustment: "Adjustment" };

export default function Credits() {
  const { profile, isSSRole, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();
  const clientId = profile?.client_id ?? null;
  const canEdit = isSSRole || isClientAdmin;

  const { data: summary, isLoading } = useQuery({
    queryKey: ["credit-summary", clientId],
    queryFn: async () => {
      const { data, error } = await db.rpc("credit_summary", { p_client: clientId });
      if (error) throw error;
      return data as Summary;
    },
    enabled: !!clientId,
  });
  const { data: packs = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async () => {
      const { data, error } = await db.from("credit_packs").select("*").eq("active", true).order("sort");
      if (error) throw error;
      return data as Pack[];
    },
  });
  const { data: prices = [] } = useQuery({
    queryKey: ["credit-prices"],
    queryFn: async () => {
      const { data, error } = await db.from("design_styles").select("key, name, description, credits, is_addon").eq("active", true).gt("credits", 0).order("credits");
      if (error) throw error;
      return data as Price[];
    },
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["credit-ledger", clientId],
    queryFn: async () => {
      const { data, error } = await db
        .from("credit_ledger")
        .select("id, delta, kind, note, style_key, created_at, posts(title)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!clientId,
  });

  const setAutoTopup = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await db.from("client_credit_settings").upsert({ client_id: clientId, auto_topup: on, updated_at: new Date().toISOString() }, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: (_d, on) => {
      queryClient.invalidateQueries({ queryKey: ["credit-summary", clientId] });
      toast.success(on ? "Auto top-up on. We add the Standard pack when you dip under 20." : "Auto top-up off. We will ask before adding credits.");
    },
    onError: () => toast.error("Could not save that. Try again."),
  });

  if (!clientId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground">Credits</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page belongs to a client account. Use View As to open it for a client.</p>
      </div>
    );
  }
  if (isLoading || !summary) return <div className="p-6 flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;

  const circ = 2 * Math.PI * 56;
  const pct = summary.monthly_credits > 0 ? Math.min(1, summary.included_left / summary.monthly_credits) : 0;
  const resets = new Date(summary.resets_on + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const buyUrl = (p: Pack) => {
    if (!p.payment_link_url) return null;
    const u = new URL(p.payment_link_url);
    u.searchParams.set("client_reference_id", `credits-${clientId}-${p.key}`);
    if (profile?.email) u.searchParams.set("prefilled_email", profile.email);
    return u.toString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Credits</h1>
        <p className="text-sm text-muted-foreground">Video and character work runs on credits. Your plan includes some every month; buy more any time. Images and the standard styles never use credits.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
        {/* Balance */}
        <div className="rounded-2xl p-5 flex items-center gap-5" style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}>
          <div className="relative h-[132px] w-[132px] shrink-0">
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden>
              <circle cx="66" cy="66" r="56" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="12" />
              <circle cx="66" cy="66" r="56" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(circ * pct).toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 66 66)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold leading-none">{summary.balance}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1">credits</div>
            </div>
          </div>
          <div className="space-y-2 text-sm min-w-0">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-primary">Balance</div>
            <div className="flex justify-between gap-4"><span className="opacity-70">Included this month</span><span className="font-semibold">{summary.included_left} of {summary.monthly_credits}</span></div>
            <div className="flex justify-between gap-4"><span className="opacity-70">Purchased, never expire</span><span className="font-semibold">{summary.purchased_left}</span></div>
            <div className="flex justify-between gap-4"><span className="opacity-70">Included resets</span><span className="font-semibold">{resets}</span></div>
            <p className="text-xs opacity-60 leading-snug">Included credits are used first and do not roll over.</p>
          </div>
        </div>

        {/* Plan */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-primary">Your plan</div>
          <div className="text-xl font-bold">{summary.plan_name || "No plan assigned"}</div>
          <p className="text-sm text-muted-foreground">
            {summary.monthly_credits > 0
              ? <><strong className="text-foreground">{summary.monthly_credits} credits included</strong> every month, about {Math.round(summary.monthly_credits / 50)} videos.</>
              : "Ask us and we will set your plan so your included credits show here."}
          </p>
          <div className="mt-auto pt-2 text-sm">
            <Link to="/client/brand-profile?tab=plan" className="text-primary font-medium hover:underline">Plan details</Link>
          </div>
        </div>

        {/* Auto top-up */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-primary">Auto top-up</div>
            <Switch checked={summary.auto_topup} onCheckedChange={(v) => setAutoTopup.mutate(v)} disabled={!canEdit || setAutoTopup.isPending} aria-label="Auto top-up" />
          </div>
          <div className="text-lg font-semibold leading-tight">{summary.auto_topup ? "On: Standard pack when under 20" : "Off: we ask before adding"}</div>
          <p className="text-sm text-muted-foreground">When your balance drops under 20 we add the Standard pack and email the receipt. Never more than once a week.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Packs */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Buy credits</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {packs.map((p) => {
              const url = buyUrl(p);
              return (
                <div key={p.key} className={cn("rounded-2xl border bg-card p-4 flex flex-col gap-1", p.key === "standard" && "border-primary/50")}>
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-primary">{p.name}{p.key === "standard" && " · most popular"}</div>
                  <div className="text-3xl font-bold leading-none">{p.credits}<span className="text-xs font-medium text-muted-foreground ml-1">credits</span></div>
                  <div className="font-semibold">{money(p.price_cents)} <span className="text-xs text-muted-foreground font-normal">{p.currency}</span></div>
                  <div className="text-xs text-muted-foreground">{(p.price_cents / 100 / p.credits).toLocaleString("en-CA", { style: "currency", currency: "CAD" })} a credit</div>
                  {url && canEdit ? (
                    <Button asChild size="sm" className="mt-2"><a href={url} target="_blank" rel="noopener noreferrer">Buy now</a></Button>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2" disabled>{canEdit ? "Ask us to add this" : "Account owner only"}</Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Charged by card on a secure Stripe page. Credits land within a minute and never expire.</p>
        </div>

        {/* Prices */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">What things cost</h2>
          <div className="rounded-2xl border overflow-hidden text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 bg-muted/40 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground"><span>Style</span><span>Credits</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 border-t items-center">
              <div><div className="font-semibold">Images and standard styles</div><div className="text-xs text-muted-foreground">Brand, quote, testimonial, hero object, photo, editorial, carousel</div></div>
              <span className="font-semibold text-primary">Included</span>
            </div>
            {prices.map((r) => (
              <div key={r.key} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 border-t items-center">
                <div><div className="font-semibold">{r.name}</div><div className="text-xs text-muted-foreground">{r.description}</div></div>
                <span className="font-semibold">{r.credits}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 border-t items-center">
              <div><div className="font-semibold">Character build</div><div className="text-xs text-muted-foreground">One time per character, then reused</div></div>
              <span className="font-semibold text-primary">Included</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-3"><h2 className="text-lg font-bold">Activity</h2><span className="text-sm text-muted-foreground">Every credit, with the post it went to.</span></div>
        <div className="rounded-2xl border overflow-hidden text-sm">
          {ledger.length === 0 && <div className="px-4 py-6 text-muted-foreground">Nothing yet. Your first video shows up here.</div>}
          {ledger.map((l) => (
            <div key={l.id} className="grid grid-cols-[88px_1fr_auto_64px] gap-3 px-4 py-3 border-t first:border-t-0 items-center">
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
              <span className="min-w-0"><span className="font-semibold">{l.note || KIND_LABEL[l.kind]}</span>{l.posts?.title && <span className="block text-xs text-muted-foreground truncate">{l.posts.title}</span>}</span>
              <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[l.kind] || l.kind}</Badge>
              <span className={cn("text-right font-semibold", l.delta < 0 ? "text-coral" : "text-primary")}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
