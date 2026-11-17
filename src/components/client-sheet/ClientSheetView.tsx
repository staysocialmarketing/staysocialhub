import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, ExternalLink, Lock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ASKS, LADDER, OWNER_LABEL, STAGE_LABEL, ageText, daysUntil, dueText, ladderCounts, sheetKey, sortSheets,
  type AskKey, type HubStats, type LogLine, type Owner, type Sheet, type Stage,
} from "@/lib/clientSheet";
import { SheetEditor } from "./SheetEditor";

/**
 * The client sheet, as a page: every client on one line (or as a ladder map) on the left, the
 * sheet for the one you picked on the right. Presentational: the page above it reads and writes.
 */
export interface ClientSheetViewProps {
  sheets: Sheet[];
  logs: Record<string, LogLine[]>;
  /** HUB numbers by client id. Missing for a sheet with no HUB workspace. */
  stats: Record<string, HubStats>;
  today: Date;
  busy?: boolean;
  onSave: (sheet: Sheet, patch: Partial<Sheet>) => void;
  onDone: (sheet: Sheet, nextMove: string, nextDue: string | null) => void;
  onLog: (sheet: Sheet, text: string) => void;
  onAdd: (name: string) => void;
}

const stageTone: Record<Stage, string> = {
  onboarding: "bg-info/15 text-info",
  steady: "bg-muted text-muted-foreground",
  grow: "bg-accent text-accent-foreground",
  risk: "bg-coral/15 text-coral",
  hold: "bg-muted text-muted-foreground/70",
};

function StagePill({ stage }: { stage: Stage }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", stageTone[stage])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STAGE_LABEL[stage]}
    </span>
  );
}

function OwnerDot({ owner }: { owner: Owner | null }) {
  if (!owner) return <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-border text-[11px] text-muted-foreground" title="Nobody yet">?</span>;
  return (
    <span title={OWNER_LABEL[owner]} className={cn("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", owner === "tristan" ? "bg-primary text-primary-foreground" : "bg-foreground text-background")}>
      {owner === "corey" ? "C" : "T"}
    </span>
  );
}

function Due({ due, today, className }: { due: string | null; today: Date; className?: string }) {
  const n = daysUntil(due, today);
  return <span className={cn("whitespace-nowrap text-xs font-semibold tabular-nums", n !== null && n < 0 ? "text-coral" : "text-muted-foreground", className)}>{dueText(due, today)}</span>;
}

function Chips({ sheet }: { sheet: Sheet }) {
  const held = LADDER.filter((k) => sheet.has[k]);
  if (!held.length && !sheet.next_offer) return <span className="text-[11px] text-muted-foreground">Ladder not set</span>;
  return (
    <>
      {held.map((k) => <span key={k} className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{k}{sheet.has[k] !== "Yes" ? ` ${sheet.has[k]}` : ""}</span>)}
      {sheet.next_offer && <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-accent-foreground ring-1 ring-inset ring-primary">Next: {sheet.next_offer}</span>}
    </>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</p>;

export function ClientSheetView({ sheets, logs, stats, today, busy, onSave, onDone, onLog, onAdd }: ClientSheetViewProps) {
  const [view, setView] = useState<"list" | "map">("list");
  const [ask, setAsk] = useState<AskKey | null>(null);
  const [owner, setOwner] = useState<Owner | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");

  const visible = useMemo(() => {
    const test = ASKS.find((a) => a.key === ask)?.test;
    return sortSheets(sheets.filter((s) => (!test || test(s, today)) && (owner === "all" || s.next_owner === owner)));
  }, [sheets, ask, owner, today]);
  const ordered = useMemo(() => sortSheets(sheets), [sheets]);
  // Until someone picks, open the most urgent client, and then keep that one open: saving re-sorts the
  // list, and the sheet you are working on must not change under you.
  if (picked === null && ordered[0]) setPicked(sheetKey(ordered[0]));
  const current = sheets.find((s) => sheetKey(s) === picked) ?? ordered[0] ?? null;
  const counts = useMemo(() => ladderCounts(sheets), [sheets]);
  const unchecked = sheets.filter((s) => s.id && !s.confirmed).length;

  const pick = (s: Sheet) => { setPicked(sheetKey(s)); setReading(true); };
  const seg = (on: boolean) => cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Client sheet</h2>
          <p className="text-sm text-muted-foreground">Who needs what, and what we do next. {format(today, "EEEE, MMM d")}.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"><Lock className="h-3 w-3" aria-hidden />Admin only · Corey and Tristan</span>
      </div>

      {unchecked > 0 && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm font-medium text-foreground">
          {unchecked} {unchecked === 1 ? "sheet is" : "sheets are"} Rook&apos;s first fill from the notes and {unchecked === 1 ? "has" : "have"} not been checked. Open one, fix what is wrong, and mark it checked.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ASKS.map((a) => {
          const n = sheets.filter((s) => a.test(s, today)).length;
          return (
            <button key={a.key} type="button" aria-pressed={ask === a.key} onClick={() => setAsk(ask === a.key ? null : a.key)}
              className={cn("grid gap-0.5 rounded-xl border-2 p-3.5 text-left transition-colors", ask === a.key ? "border-primary bg-accent" : "border-transparent bg-muted/60 hover:border-border")}>
              <b className={cn("font-display text-3xl font-semibold leading-none tabular-nums", a.key === "risk" && n > 0 && "text-coral", a.key === "grow" && n > 0 && "text-accent-foreground")}>{n}</b>
              <span className="text-sm font-semibold text-foreground">{a.label}</span>
              <small className="hidden text-xs text-muted-foreground sm:block">{a.hint}</small>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted/60 p-0.5" role="group" aria-label="View">
          <button type="button" className={seg(view === "list")} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
          <button type="button" className={seg(view === "map")} aria-pressed={view === "map"} onClick={() => setView("map")}>Ladder map</button>
        </div>
        <div className="inline-flex rounded-lg bg-muted/60 p-0.5" role="group" aria-label="Whose move">
          {(["all", "corey", "tristan"] as const).map((o) => (
            <button key={o} type="button" className={seg(owner === o)} aria-pressed={owner === o} onClick={() => setOwner(o)}>{o === "all" ? "Everyone" : OWNER_LABEL[o]}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "client" : "clients"}</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className={cn("min-w-0 space-y-3", reading && "hidden lg:block")}>
          {!visible.length && <p className="text-sm text-muted-foreground">Nobody matches. Clear the filter above.</p>}

          {view === "list" && (
            <ul className="grid gap-2">
              {visible.map((s) => (
                <li key={sheetKey(s)}>
                  <button type="button" onClick={() => pick(s)} aria-current={current !== null && sheetKey(s) === sheetKey(current)}
                    className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl border-2 bg-card p-3.5 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]",
                      current !== null && sheetKey(s) === sheetKey(current) ? "border-primary ring-2 ring-accent" : "border-border hover:border-muted-foreground/50")}>
                    <span className="min-w-0">
                      <b className="block break-words text-[15px] font-bold text-foreground">{s.name}</b>
                      {s.kind && <small className="block truncate text-xs text-muted-foreground">{s.kind}</small>}
                      <span className="mt-1.5 flex flex-wrap gap-1"><Chips sheet={s} /></span>
                    </span>
                    <span className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StagePill stage={s.stage} />
                        {s.id && !s.confirmed && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-foreground">Not checked</span>}
                      </span>
                      <span className={cn("mt-1.5 block text-sm", s.next_move ? "text-foreground" : "italic text-muted-foreground")}>{s.next_move ?? "No next move decided."}</span>
                    </span>
                    <span className="grid justify-items-end gap-1.5"><OwnerDot owner={s.next_owner} /><Due due={s.next_move ? s.next_due : null} today={today} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {view === "map" && visible.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border-2 border-border bg-card">
                <table className="w-full min-w-[600px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-bold">Client</th>
                      {LADDER.map((k) => <th key={k} className="px-2 py-2.5 font-bold">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => (
                      <tr key={sheetKey(s)} className={cn("border-b border-border last:border-0", current !== null && sheetKey(s) === sheetKey(current) && "bg-accent")}>
                        <td className="px-3 py-2"><button type="button" className="text-left font-bold text-foreground hover:underline" onClick={() => pick(s)}>{s.name}</button></td>
                        {LADDER.map((k) => (
                          <td key={k} className="px-2 py-2 text-center">
                            {s.has[k]
                              ? <span className="inline-block min-w-[60px] rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{s.has[k] === "Yes" ? "Has it" : s.has[k]}</span>
                              : s.next_offer === k
                                ? <span className="inline-block min-w-[60px] rounded-md px-2 py-1 text-xs font-semibold text-accent-foreground ring-1 ring-inset ring-primary">Next</span>
                                : <span className="text-muted-foreground/50" aria-label="Not yet">·</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground">
                      <td className="px-3 py-2">All {sheets.length} clients</td>
                      {LADDER.map((k) => <td key={k} className="px-2 py-2 text-center tabular-nums">{counts[k].has} have it · {counts[k].next} next</td>)}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Filled: paying for it now. Outlined: the one thing to offer next. Empty: not yet, or not a fit.</p>
            </>
          )}

          <form className="flex gap-2 pt-1" onSubmit={(e) => { e.preventDefault(); const n = adding.trim(); if (!n) return; onAdd(n); setAdding(""); }}>
            <Input id="client-sheet-add" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a client that has no HUB workspace" className="h-9 max-w-xs text-sm" aria-label="Name of a client to add" />
            <Button type="submit" variant="outline" size="sm" className="h-9" disabled={!adding.trim() || busy}><Plus className="mr-1 h-4 w-4" aria-hidden />Add sheet</Button>
          </form>
        </div>

        {current && (
          <SheetPanel key={sheetKey(current)} className={cn(!reading && "hidden lg:grid")} sheet={current} log={current.id ? logs[current.id] ?? [] : []}
            stats={current.client_id ? stats[current.client_id] : undefined} today={today} busy={busy}
            onBack={() => setReading(false)} onEdit={() => setEditing(true)} onSave={onSave} onDone={onDone} onLog={onLog} />
        )}
      </div>

      {current && editing && <SheetEditor sheet={current} today={today} onClose={() => setEditing(false)} onSave={(patch) => { onSave(current, patch); setEditing(false); }} />}
    </div>
  );
}

function SheetPanel({ sheet, log, stats, today, busy, className, onBack, onEdit, onSave, onDone, onLog }: {
  sheet: Sheet; log: LogLine[]; stats?: HubStats; today: Date; busy?: boolean; className?: string;
  onBack: () => void; onEdit: () => void;
  onSave: ClientSheetViewProps["onSave"]; onDone: ClientSheetViewProps["onDone"]; onLog: ClientSheetViewProps["onLog"];
}) {
  const [finishing, setFinishing] = useState(false);
  const [next, setNext] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const heard = stats?.lastHeard ? ageText(stats.lastHeard.slice(0, 10), today) : null;

  return (
    <aside className={cn("grid gap-5 rounded-2xl border-2 border-border bg-card p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto", className)} aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8 lg:hidden" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" aria-hidden />Clients</Button>
        <StagePill stage={sheet.stage} />
        <span className="flex items-center gap-1.5">
          {sheet.ghl_url && <a href={sheet.ghl_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:text-foreground">GoHighLevel<ExternalLink className="h-3 w-3" aria-hidden /></a>}
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />Edit</Button>
        </span>
      </div>

      <div>
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground">{sheet.name}</h3>
        {sheet.kind && <p className="text-sm text-muted-foreground">{sheet.kind}</p>}
        {sheet.id && !sheet.confirmed && (
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-foreground">
            Rook&apos;s first fill from the notes. Not checked yet.
            <Button type="button" size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => onSave(sheet, { confirmed: true })}><Check className="mr-1 h-3.5 w-3.5" aria-hidden />Looks right</Button>
          </p>
        )}
      </div>

      <section>
        <Label>Next move</Label>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className={cn("font-display text-lg leading-snug", sheet.next_move ? "text-foreground" : "italic text-muted-foreground")}>{sheet.next_move ?? "No next move decided. Use Edit to set one."}</p>
          {sheet.next_move && !finishing && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><OwnerDot owner={sheet.next_owner} />{sheet.next_owner ? OWNER_LABEL[sheet.next_owner] : "Nobody yet"} · <Due due={sheet.next_due} today={today} className="text-sm" /></span>
              <Button type="button" size="sm" disabled={busy} onClick={() => setFinishing(true)}>Mark done</Button>
            </div>
          )}
          {finishing && (
            <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); onDone(sheet, next.trim(), due || null); setFinishing(false); setNext(""); setDue(""); }}>
              <label htmlFor="sheet-next-move" className="text-sm font-semibold text-muted-foreground">Done. What is the next move for {sheet.name}?</label>
              <Input id="sheet-next-move" autoFocus value={next} onChange={(e) => setNext(e.target.value)} placeholder="One line, starting with a verb" />
              <div className="flex flex-wrap items-center gap-2">
                <Input id="sheet-next-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 w-auto" aria-label="Due date for the next move" />
                <Button type="submit" size="sm" disabled={busy}>Save next move</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFinishing(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section>
        <Label>Where they are on the ladder</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {LADDER.map((k) => (
            <div key={k} className={cn("grid min-w-0 gap-0.5 rounded-lg px-1 py-2 text-center text-[11px] font-semibold",
              sheet.has[k] ? "bg-primary text-primary-foreground" : sheet.next_offer === k ? "text-accent-foreground ring-1 ring-inset ring-primary" : "bg-muted/60 text-muted-foreground")}>
              <b className="break-words text-xs">{k}</b>
              {sheet.has[k] ? (sheet.has[k] === "Yes" ? "Has it" : sheet.has[k]) : sheet.next_offer === k ? "Next" : "Not yet"}
            </div>
          ))}
        </div>
        {sheet.next_offer ? (
          <dl className="mt-3 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="pt-0.5 text-xs font-semibold text-muted-foreground">The offer</dt><dd className="font-semibold text-foreground">{sheet.offer_what ?? sheet.next_offer}</dd>
            <dt className="pt-0.5 text-xs font-semibold text-muted-foreground">Why now</dt><dd className={sheet.offer_why ? "text-foreground" : "italic text-muted-foreground"}>{sheet.offer_why ?? "Not written yet."}</dd>
            <dt className="pt-0.5 text-xs font-semibold text-muted-foreground">How to open</dt><dd className={sheet.offer_open ? "italic text-foreground" : "italic text-muted-foreground"}>{sheet.offer_open ?? "Not written yet."}</dd>
          </dl>
        ) : <p className="mt-3 text-sm text-muted-foreground">Nothing to offer right now.</p>}
      </section>

      <section>
        <Label>What we know</Label>
        {sheet.know.length ? (
          <ul className="grid gap-1.5 text-sm text-foreground">{sheet.know.map((k, i) => <li key={i} className="relative pl-3.5 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary">{k}</li>)}</ul>
        ) : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
      </section>

      <section>
        <Label>Open loops</Label>
        {sheet.loops.length ? (
          <ul className="grid gap-2 text-sm">
            {sheet.loops.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span className="text-foreground"><span className={cn("mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", l.side === "us" ? "bg-warning/20 text-foreground" : "bg-muted text-muted-foreground")}>{l.side === "us" ? "Us" : "Them"}</span>{l.text}</span>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{ageText(l.since, today)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nothing open.</p>}
      </section>

      {stats && (
        <section>
          <Label>From the HUB, filled in for you</Label>
          <div className="grid grid-cols-3 gap-2">
            {[[String(stats.scheduled), "posts scheduled ahead"], [String(stats.waiting), "waiting on their approval"], [heard ?? "never", heard ? "since they last wrote or approved" : "heard from in the HUB"]].map(([n, l]) => (
              <div key={l} className="rounded-lg bg-muted/60 px-3 py-2.5"><b className="block font-display text-xl font-semibold leading-tight tabular-nums text-foreground">{n}</b><small className="text-xs text-muted-foreground">{l}</small></div>
            ))}
          </div>
        </section>
      )}

      <section>
        <Label>Log</Label>
        {sheet.id && (
          <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = note.trim(); if (!t) return; onLog(sheet, t); setNote(""); }}>
            <Input id="sheet-log-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a line: a decision, a call, a change" className="h-9 text-sm" aria-label="New log line" />
            <Button type="submit" size="sm" variant="outline" className="h-9" disabled={!note.trim() || busy}>Add</Button>
          </form>
        )}
        {log.length ? (
          <ul className="grid gap-2 text-sm">{log.map((l) => <li key={l.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5"><time className="pt-px text-xs tabular-nums text-muted-foreground">{format(parseISO(l.at), "MMM d")}</time><span className="text-foreground">{l.text}</span></li>)}</ul>
        ) : <p className="text-sm text-muted-foreground">No history yet.</p>}
      </section>

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">Contacts, messages and billing stay in GoHighLevel. This sheet only holds what the two of you decide. Clients never see it.</p>
    </aside>
  );
}
