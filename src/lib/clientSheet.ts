/**
 * Client sheet: the shapes and the small rules behind the admin-only sheet (Clients > Client sheet).
 * One sheet per client: where they are on the product ladder, the one next move, the one thing to
 * offer next. Kept free of React and Supabase so the rules can be tested on their own.
 */
import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const LADDER = ["Site", "Studio", "HUB", "Front Desk", "Reviews"] as const;
export type LadderKey = (typeof LADDER)[number];

/** What a client can hold on each rung. "Yes" where there are no tiers. */
export const TIERS: Record<LadderKey, string[]> = {
  Site: ["Lite", "Custom"],
  Studio: ["One", "Team", "Brand", "Yes"],
  HUB: ["Yes"],
  "Front Desk": ["Yes"],
  Reviews: ["Yes"],
};

export const STAGES = ["onboarding", "steady", "grow", "risk", "hold"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { onboarding: "Onboarding", steady: "Steady", grow: "Ready to grow", risk: "At risk", hold: "On hold" };

export type Owner = "corey" | "tristan";
export const OWNER_LABEL: Record<Owner, string> = { corey: "Corey", tristan: "Tristan" };

export interface Loop { side: "us" | "them"; text: string; since: string | null }
export interface LogLine { id: string; sheet_id: string; at: string; text: string }
export interface HubStats { scheduled: number; waiting: number; lastHeard: string | null }

export interface Sheet {
  /** null until the first save: a HUB client that has no sheet row yet. */
  id: string | null;
  client_id: string | null;
  name: string;
  kind: string | null;
  stage: Stage;
  has: Partial<Record<LadderKey, string>>;
  next_offer: LadderKey | null;
  offer_what: string | null;
  offer_why: string | null;
  offer_open: string | null;
  next_move: string | null;
  next_owner: Owner | null;
  next_due: string | null;
  know: string[];
  loops: Loop[];
  ghl_url: string | null;
  confirmed: boolean;
  updated_at: string | null;
  /** Rungs already recorded as the client's plan in Admin > Clients. Read-only here; they win over `has`. */
  planned?: Partial<Record<LadderKey, string>>;
}

/** A sheet nobody has filled yet, for a HUB client without a row. */
export const blankSheet = (client: { id: string; name: string; status?: string | null; niche?: string | null }): Sheet => ({
  id: null, client_id: client.id, name: client.name, kind: client.niche || null,
  stage: client.status === "on_hold" ? "hold" : "steady",
  has: {}, next_offer: null, offer_what: null, offer_why: null, offer_open: null,
  next_move: null, next_owner: null, next_due: null, know: [], loops: [], ghl_url: null, confirmed: false, updated_at: null,
});

/** A plan name from the plans table to its rung on the ladder. Plans off the ladder (Brokerage Command) return null. */
export function rungOf(planName: string): [LadderKey, string] | null {
  const m = /^Studio (One|Team|Brand)$/.exec(planName);
  if (m) return ["Studio", m[1]];
  if (planName === "Sites Lite") return ["Site", "Lite"];
  if (planName === "Custom site") return ["Site", "Custom"];
  if (planName === "HUB") return ["HUB", "Yes"];
  if (planName === "AI Front Desk") return ["Front Desk", "Yes"];
  if (planName === "Reviews & Reputation") return ["Reviews", "Yes"];
  return null;
}

/** The ladder as shown: the sheet's own notes, overridden by what the client's plan record says. */
export const withPlan = (s: Sheet, planned: Partial<Record<LadderKey, string>>): Sheet =>
  Object.keys(planned).length ? { ...s, planned, has: { ...s.has, ...planned }, next_offer: s.next_offer && planned[s.next_offer] ? null : s.next_offer } : s;

/** A key that stays the same when a blank sheet gets its row on the first save. */
export const sheetKey = (s: Sheet) => (s.client_id ? `client:${s.client_id}` : `sheet:${s.id}`);

/** Rows come back with loose JSON; make them safe to render whatever was written. */
export function toSheet(row: Record<string, unknown>): Sheet {
  const has: Sheet["has"] = {};
  const rawHas = (row.has && typeof row.has === "object" ? row.has : {}) as Record<string, unknown>;
  for (const k of LADDER) if (typeof rawHas[k] === "string" && rawHas[k]) has[k] = rawHas[k] as string;
  const loops = (Array.isArray(row.loops) ? row.loops : []).filter((l): l is Loop => !!l && typeof l === "object" && typeof (l as Loop).text === "string")
    .map((l) => ({ side: l.side === "us" ? "us" as const : "them" as const, text: l.text, since: typeof l.since === "string" ? l.since : null }));
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    id: String(row.id), client_id: str(row.client_id), name: String(row.name ?? ""), kind: str(row.kind),
    stage: (STAGES as readonly string[]).includes(String(row.stage)) ? (row.stage as Stage) : "steady",
    has, next_offer: (LADDER as readonly string[]).includes(String(row.next_offer)) ? (row.next_offer as LadderKey) : null,
    offer_what: str(row.offer_what), offer_why: str(row.offer_why), offer_open: str(row.offer_open),
    next_move: str(row.next_move), next_owner: row.next_owner === "corey" || row.next_owner === "tristan" ? row.next_owner : null,
    next_due: str(row.next_due), know: (Array.isArray(row.know) ? row.know : []).filter((k): k is string => typeof k === "string" && !!k.trim()),
    loops, ghl_url: str(row.ghl_url), confirmed: row.confirmed === true, updated_at: str(row.updated_at),
  };
}

/** Days from today to the due date: negative is late, null is no date. */
export const daysUntil = (due: string | null, today: Date) => (due ? differenceInCalendarDays(parseISO(due), today) : null);

export function dueText(due: string | null, today: Date): string {
  const n = daysUntil(due, today);
  if (n === null) return "No date";
  if (n < 0) return `${-n} ${n === -1 ? "day" : "days"} late`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 7) return `In ${n} days`;
  return format(parseISO(due as string), "MMM d");
}

/** How long something has been open, for the loops list. */
export function ageText(since: string | null, today: Date): string {
  if (!since) return "";
  const n = differenceInCalendarDays(today, parseISO(since));
  return n <= 0 ? "today" : n === 1 ? "1 day" : `${n} days`;
}

export type AskKey = "week" | "grow" | "risk" | "unset";
/** The questions at the top of the page. Each is a count and a filter. */
export const ASKS: { key: AskKey; label: string; hint: string; test: (s: Sheet, today: Date) => boolean }[] = [
  { key: "week", label: "Need a move this week", hint: "Due in the next 7 days, or already late",
    test: (s, today) => { const n = daysUntil(s.next_due, today); return s.stage !== "hold" && !!s.next_move && n !== null && n <= 6; } },
  { key: "grow", label: "Ready for the next step", hint: "A reason to offer something now", test: (s) => s.stage === "grow" },
  { key: "risk", label: "Quiet or at risk", hint: "Stalled approvals or no contact", test: (s) => s.stage === "risk" },
  { key: "unset", label: "No next move", hint: "Nothing decided yet", test: (s) => s.stage !== "hold" && !s.next_move },
];

/** Most urgent first: dated moves by date, then undated, then no move at all; on hold always last. */
export function sortSheets(list: Sheet[]): Sheet[] {
  const rank = (s: Sheet) => (s.stage === "hold" ? 3 : !s.next_move ? 2 : s.next_due ? 0 : 1);
  return [...list].sort((a, b) => rank(a) - rank(b) || (a.next_due ?? "").localeCompare(b.next_due ?? "") || a.name.localeCompare(b.name));
}

/** Per rung: how many clients hold it and how many have it as their next offer. */
export function ladderCounts(list: Sheet[]): Record<LadderKey, { has: number; next: number }> {
  const out = Object.fromEntries(LADDER.map((k) => [k, { has: 0, next: 0 }])) as Record<LadderKey, { has: number; next: number }>;
  for (const s of list) for (const k of LADDER) { if (s.has[k]) out[k].has++; else if (s.next_offer === k) out[k].next++; }
  return out;
}

/** One-per-line text boxes in the editor, to and from the stored lists. Unchanged loop lines keep their start date. */
export const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
export function loopsFrom(themText: string, usText: string, previous: Loop[], todayIso: string): Loop[] {
  const keep = (side: Loop["side"], text: string) => previous.find((p) => p.side === side && p.text === text)?.since ?? todayIso;
  return [
    ...linesOf(themText).map((text) => ({ side: "them" as const, text, since: keep("them", text) })),
    ...linesOf(usText).map((text) => ({ side: "us" as const, text, since: keep("us", text) })),
  ];
}
