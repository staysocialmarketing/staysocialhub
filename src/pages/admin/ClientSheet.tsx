import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { ClientSheetView } from "@/components/client-sheet/ClientSheetView";
import { blankSheet, rungOf, toSheet, withPlan, type HubStats, type LadderKey, type LogLine, type Sheet } from "@/lib/clientSheet";

/**
 * Clients > Client sheet. ss_admin only, here and in the database (row level security on
 * client_sheets and client_sheet_log). Every HUB client that is not archived shows up, with a blank
 * sheet until someone saves one; a sheet can also exist for a client with no HUB workspace.
 */
const KEY = ["client-sheets"];

async function load() {
  const [sheets, logs, clients, posts, people] = await Promise.all([
    supabase.from("client_sheets").select("*"),
    supabase.from("client_sheet_log").select("id, sheet_id, at, text").order("at", { ascending: false }).order("created_at", { ascending: false }).limit(1500),
    supabase.from("clients").select("id, name, status, niche, plan_id").neq("status", "archived"),
    supabase.from("posts").select("client_id, status_column, scheduled_at").in("status_column", ["scheduled", "client_approval"]),
    supabase.from("users").select("id, client_id").not("client_id", "is", null),
  ]);
  for (const r of [sheets, logs, clients, posts, people]) if (r.error) throw r.error;

  // The last time each client wrote a comment or answered an approval in the HUB.
  const clientOf = new Map((people.data ?? []).map((u) => [u.id, u.client_id as string]));
  const ids = [...clientOf.keys()];
  const [comments, approvals] = ids.length
    ? await Promise.all([
        supabase.from("comments").select("user_id, created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(1000),
        supabase.from("approvals").select("user_id, created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(1000),
      ])
    : [{ data: [] }, { data: [] }];

  const stats: Record<string, HubStats> = {};
  const at = (id: string) => (stats[id] ??= { scheduled: 0, waiting: 0, lastHeard: null });
  const todayIso = format(new Date(), "yyyy-MM-dd");
  for (const p of posts.data ?? []) {
    if (!p.client_id) continue;
    if (p.status_column === "client_approval") at(p.client_id).waiting++;
    else if (!p.scheduled_at || p.scheduled_at.slice(0, 10) >= todayIso) at(p.client_id).scheduled++;
  }
  for (const row of [...(comments.data ?? []), ...(approvals.data ?? [])]) {
    const c = row.user_id ? clientOf.get(row.user_id) : undefined;
    if (c && (!at(c).lastHeard || row.created_at > (at(c).lastHeard as string))) at(c).lastHeard = row.created_at;
  }
  for (const c of clients.data ?? []) at(c.id);

  // What Admin > Clients already records as each client's plan: the primary plan and any other services.
  // client_services is newer than the generated types, hence the cast (same as Plan.tsx and AdminClients.tsx).
  const [plans, services] = await Promise.all([
    supabase.from("plans").select("id, name"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("client_services").select("client_id, plan_id") as Promise<{ data: { client_id: string; plan_id: string }[] | null }>,
  ]);
  const planName = new Map((plans.data ?? []).map((p) => [p.id, p.name]));
  const planned: Record<string, Partial<Record<LadderKey, string>>> = {};
  const record = (clientId: string, planId: string | null) => {
    const rung = planId ? rungOf(planName.get(planId) ?? "") : null;
    if (rung) (planned[clientId] ??= {})[rung[0]] = rung[1];
  };
  for (const c of clients.data ?? []) record(c.id, c.plan_id);
  for (const r of services.data ?? []) record(r.client_id, r.plan_id);

  const saved = (sheets.data ?? []).map((r) => toSheet(r as Record<string, unknown>));
  const have = new Set(saved.map((s) => s.client_id).filter(Boolean));
  const live = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
  const all = [
    // A saved sheet follows the client's current name in the HUB.
    ...saved.map((s) => (s.client_id && live.has(s.client_id) ? { ...s, name: live.get(s.client_id) as string } : s)),
    ...(clients.data ?? []).filter((c) => !have.has(c.id)).map(blankSheet),
  ].map((s) => (s.client_id && planned[s.client_id] ? withPlan(s, planned[s.client_id]) : s));
  const byId: Record<string, LogLine[]> = {};
  for (const l of (logs.data ?? []) as LogLine[]) (byId[l.sheet_id] ??= []).push(l);
  return { sheets: all, logs: byId, stats };
}

/** What goes in the row: the sheet's own fields, never its id or the read-only bits. */
function rowOf(sheet: Sheet, patch: Partial<Sheet>, userId: string | null) {
  const s = { ...sheet, ...patch };
  // Rungs that come from the plan record are shown, not stored: keep only the sheet's own notes.
  const own = Object.fromEntries(Object.entries(s.has).filter(([k]) => !sheet.planned?.[k as LadderKey]));
  return {
    client_id: s.client_id, name: s.name, kind: s.kind, stage: s.stage, has: own as Json, next_offer: s.next_offer,
    offer_what: s.offer_what, offer_why: s.offer_why, offer_open: s.offer_open,
    next_move: s.next_move, next_owner: s.next_owner, next_due: s.next_due,
    know: s.know as Json, loops: s.loops as unknown as Json, ghl_url: s.ghl_url, confirmed: s.confirmed,
    updated_at: new Date().toISOString(), updated_by: userId,
  };
}

export default function ClientSheet() {
  const { profile, isSSAdmin } = useAuth();
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const userId = profile?.id ?? null;
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: load, enabled: isSSAdmin });

  /** Save a sheet, creating its row on the first save. Returns the row id. */
  const write = async (sheet: Sheet, patch: Partial<Sheet>) => {
    const row = rowOf(sheet, patch, userId);
    if (sheet.id) {
      const { error } = await supabase.from("client_sheets").update(row).eq("id", sheet.id);
      if (error) throw error;
      return sheet.id;
    }
    const { data: made, error } = await supabase.from("client_sheets").insert(row).select("id").single();
    if (error) throw error;
    return made.id as string;
  };
  const done = { onSuccess: () => qc.invalidateQueries({ queryKey: KEY }), onError: (e: Error) => toast.error(e.message || "That did not save.") };

  const save = useMutation({ mutationFn: ({ sheet, patch }: { sheet: Sheet; patch: Partial<Sheet> }) => write(sheet, patch), ...done });
  const finish = useMutation({
    mutationFn: async ({ sheet, next, due }: { sheet: Sheet; next: string; due: string | null }) => {
      const id = await write(sheet, { next_move: next || null, next_due: next ? due : null, confirmed: true });
      if (sheet.next_move) {
        const { error } = await supabase.from("client_sheet_log").insert({ sheet_id: id, text: `Done: ${sheet.next_move}`, created_by: userId });
        if (error) throw error;
      }
    },
    ...done,
  });
  const log = useMutation({
    mutationFn: async ({ sheet, text }: { sheet: Sheet; text: string }) => {
      const id = await write(sheet, {});
      const { error } = await supabase.from("client_sheet_log").insert({ sheet_id: id, text, created_by: userId });
      if (error) throw error;
    },
    ...done,
  });
  const add = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("client_sheets").insert({ name, confirmed: true, updated_by: userId });
      if (error) throw error;
    },
    ...done,
  });

  if (!isSSAdmin) return null;
  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading the sheets.</p>;
  if (error || !data) return <p className="p-6 text-sm text-coral">The client sheets did not load. {(error as Error | null)?.message}</p>;

  return (
    <ClientSheetView
      sheets={data.sheets} logs={data.logs} stats={data.stats} today={today}
      busy={save.isPending || finish.isPending || log.isPending || add.isPending}
      onSave={(sheet, patch) => save.mutate({ sheet, patch })}
      onDone={(sheet, next, due) => finish.mutate({ sheet, next, due })}
      onLog={(sheet, text) => log.mutate({ sheet, text })}
      onAdd={(name) => add.mutate(name)}
    />
  );
}
