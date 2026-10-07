import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// The generated Supabase types predate these two tables; the repo casts in the same situation elsewhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Design styles: the looks we can use for a client's posts. All on by default from the
 * catalogue; the client (or the team) flips them. Saving writes client_design_styles, and a
 * database trigger raises a task for Corey so the rotation gets updated.
 */

type Preview = {
  image?: string; bg?: string; wash?: string; ink?: string; font?: "serif" | "sans"; sample?: string; sub?: string;
  caps?: boolean; figure?: boolean; play?: boolean;
};
type Style = {
  key: string; name: string; tag: string; description: string; long_description: string; needs: string;
  is_addon: boolean; credits: number; default_on: boolean; sort: number; preview: Preview;
};
type Override = { style_key: string; enabled: boolean };

function Tile({ p, className }: { p: Preview; className?: string }) {
  if (p.image) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)} aria-hidden>
        <img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        {p.play && (
          <div className="absolute left-3 top-3 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
            <Play className="h-3.5 w-3.5 fill-current" style={{ color: "#1a2733" }} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{ background: p.bg || "#1a2733", color: p.ink || "#f2ebdd" }}
      aria-hidden
    >
      {p.wash && p.wash !== "none" && <div className="absolute inset-0" style={{ background: p.wash }} />}
      {p.figure && (
        <div className="absolute right-4 bottom-0 h-[62%] w-[34%] rounded-t-full opacity-70" style={{ background: "rgba(242,235,221,0.35)" }} />
      )}
      <div className="absolute inset-0 flex flex-col justify-end p-4 gap-1">
        <div
          className={cn("leading-tight", p.font === "serif" ? "font-display text-[17px]" : "text-[14px] font-semibold", p.caps && "uppercase tracking-[0.06em] text-[13px]")}
          style={{ maxWidth: p.figure ? "62%" : "100%" }}
        >
          {p.sample}
        </div>
        {p.sub && <div className="text-[11px] opacity-70">{p.sub}</div>}
      </div>
      {p.play && (
        <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-white/90 text-ink flex items-center justify-center">
          <Play className="h-3.5 w-3.5 fill-current" style={{ color: "#1a2733" }} />
        </div>
      )}
    </div>
  );
}

export default function DesignStyles() {
  const { profile, isSSRole, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();
  const clientId = profile?.client_id ?? null;
  const canEdit = isSSRole || isClientAdmin;

  const { data: styles = [], isLoading } = useQuery({
    queryKey: ["design-styles"],
    queryFn: async () => {
      const { data, error } = await db.from("design_styles").select("*").eq("active", true).order("sort");
      if (error) throw error;
      return (data || []) as Style[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["client-design-styles", clientId],
    queryFn: async () => {
      const { data, error } = await db.from("client_design_styles").select("style_key, enabled").eq("client_id", clientId!);
      if (error) throw error;
      return (data || []) as Override[];
    },
    enabled: !!clientId,
  });

  const saved = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const s of styles) m[s.key] = s.default_on;
    for (const o of overrides) m[o.style_key] = o.enabled;
    return m;
  }, [styles, overrides]);

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Style | null>(null);
  const [kind, setKind] = useState<string>("all");
  const kinds = Array.from(new Set(styles.map((s) => s.tag)));
  const shown = kind === "all" ? styles : styles.filter((s) => s.tag === kind);
  const effective = (key: string) => (key in draft ? draft[key] : saved[key]);
  const changes = styles.filter((s) => s.key in draft && draft[s.key] !== saved[s.key]);
  const toggle = (key: string) => {
    if (!canEdit) return;
    setDraft((d) => {
      const next = { ...d, [key]: !effective(key) };
      if (next[key] === saved[key]) delete next[key];
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!clientId || !profile) throw new Error("No client");
      const rows = changes.map((s) => ({ client_id: clientId, style_key: s.key, enabled: draft[s.key], updated_by: profile.id, updated_at: new Date().toISOString() }));
      const { error } = await db.from("client_design_styles").upsert(rows, { onConflict: "client_id,style_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-design-styles", clientId] });
      setDraft({});
      toast.success("Saved. We will update your rotation.");
    },
    onError: () => toast.error("Could not save. Try again or message us."),
  });

  if (!clientId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground">Design styles</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page belongs to a client account. Use View As to open it for a client.</p>
      </div>
    );
  }
  if (isLoading) return <div className="p-6 flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;

  const onCount = styles.filter((s) => effective(s.key)).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Design styles</h1>
        <p className="text-sm text-muted-foreground">
          The looks we can use for your posts. Everything standard is on from day one; turn off anything that is not you,
          and turn on the add-ons when you want them. We mix the styles that are on so your feed never repeats itself.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary" className="mr-1">{onCount} of {styles.length} on</Badge>
        {["all", ...kinds].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", kind === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground")}
          >
            {k === "all" ? "All styles" : k}
          </button>
        ))}
        {!canEdit && (
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="h-3.5 w-3.5" /> View only. Ask your account owner to change styles.</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((s) => {
          const on = effective(s.key);
          const changed = s.key in draft && draft[s.key] !== saved[s.key];
          return (
            <div
              key={s.key}
              className={cn(
                "group rounded-2xl border bg-card p-3 flex flex-col gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5",
                on ? "border-border" : "border-border/60 opacity-70 grayscale-[0.4]",
                changed && "ring-2 ring-primary/40"
              )}
            >
              <button type="button" onClick={() => setOpen(s)} className="text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Tile p={s.preview || {}} className="aspect-[3/4] w-full" />
              </button>
              <div className="flex items-start gap-3 px-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] font-medium">{s.tag}</Badge>
                    {s.credits > 0 && (
                      <Badge className="text-[10px] font-semibold bg-coral/15 text-coral hover:bg-coral/15">{s.is_addon ? "Add-on · " : ""}{s.credits} credits</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
                <Switch checked={!!on} onCheckedChange={() => toggle(s.key)} disabled={!canEdit} aria-label={`${s.name} ${on ? "on" : "off"}`} />
              </div>
            </div>
          );
        })}
      </div>

      {changes.length > 0 && (
        <div className="sticky bottom-4 rounded-2xl bg-ink text-sand p-4 shadow-lg flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}>
          <div className="flex-1 text-sm">
            <div className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> What we get told</div>
            <ul className="mt-1 space-y-0.5 opacity-90">
              {changes.map((s) => (
                <li key={s.key}>{draft[s.key] ? "Add" : "Remove"} <strong>{s.name}</strong> {draft[s.key] ? "to" : "from"} the rotation{s.credits > 0 && draft[s.key] ? ` (${s.credits} credits per use)` : ""}.</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft({})} className="text-inherit hover:bg-white/10">Discard</Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {open && (
            <div className="space-y-5">
              <Tile p={open.preview || {}} className="aspect-[3/4] w-full" />
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{open.tag}</Badge>
                  {open.is_addon && <Badge className="text-[10px] bg-coral/15 text-coral hover:bg-coral/15">Add-on</Badge>}
                </div>
                <SheetTitle className="text-xl">{open.name}</SheetTitle>
                <SheetDescription className="text-sm leading-relaxed">{open.long_description || open.description}</SheetDescription>
              </SheetHeader>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cost</dt><dd className="mt-0.5">{open.credits > 0 ? `${open.credits} credits each, from the credits included in your plan` : "Included, no credits"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">What it needs from you</dt><dd className="mt-0.5">{open.needs || "Nothing."}</dd></div>
              </dl>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <span className="text-sm font-medium">{effective(open.key) ? "On" : "Off"} for your posts</span>
                <Switch checked={!!effective(open.key)} onCheckedChange={() => toggle(open.key)} disabled={!canEdit} aria-label={`${open.name} toggle`} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
