import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LADDER, OWNER_LABEL, STAGES, STAGE_LABEL, TIERS, linesOf, loopsFrom, type LadderKey, type Owner, type Sheet, type Stage } from "@/lib/clientSheet";

/** Edit one sheet. Saving marks it checked: a person has looked at it. */
export function SheetEditor({ sheet, today, onClose, onSave }: { sheet: Sheet; today: Date; onClose: () => void; onSave: (patch: Partial<Sheet>) => void }) {
  const [f, setF] = useState({
    name: sheet.name, kind: sheet.kind ?? "", stage: sheet.stage, has: { ...sheet.has } as Partial<Record<LadderKey, string>>,
    next_offer: sheet.next_offer ?? "", offer_what: sheet.offer_what ?? "", offer_why: sheet.offer_why ?? "", offer_open: sheet.offer_open ?? "",
    next_move: sheet.next_move ?? "", next_owner: sheet.next_owner ?? "", next_due: sheet.next_due ?? "",
    know: sheet.know.join("\n"),
    them: sheet.loops.filter((l) => l.side === "them").map((l) => l.text).join("\n"),
    us: sheet.loops.filter((l) => l.side === "us").map((l) => l.text).join("\n"),
    ghl_url: sheet.ghl_url ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const pick = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
  const offerable = LADDER.filter((k) => !f.has[k]);

  const save = () => {
    const has: Sheet["has"] = {};
    for (const k of LADDER) if (f.has[k]) has[k] = f.has[k];
    const offer = (LADDER as readonly string[]).includes(f.next_offer) && !has[f.next_offer as LadderKey] ? (f.next_offer as LadderKey) : null;
    onSave({
      name: f.name.trim() || sheet.name, kind: f.kind.trim() || null, stage: f.stage, has, next_offer: offer,
      offer_what: offer ? f.offer_what.trim() || null : null, offer_why: offer ? f.offer_why.trim() || null : null, offer_open: offer ? f.offer_open.trim() || null : null,
      next_move: f.next_move.trim() || null, next_owner: (f.next_owner || null) as Owner | null, next_due: f.next_due || null,
      know: linesOf(f.know), loops: loopsFrom(f.them, f.us, sheet.loops, format(today, "yyyy-MM-dd")),
      ghl_url: /^https:\/\//.test(f.ghl_url.trim()) ? f.ghl_url.trim() : null, confirmed: true,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{sheet.name}</DialogTitle>
          <DialogDescription>Only you and Tristan see this. Saving marks the sheet as checked.</DialogDescription>
        </DialogHeader>
        <form id="sheet-editor" className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
            <div className="grid gap-1.5"><Label htmlFor="se-name">Name</Label><Input id="se-name" value={f.name} onChange={(e) => set("name", e.target.value)} disabled={!!sheet.client_id} /></div>
            <div className="grid gap-1.5"><Label htmlFor="se-kind">What they do</Label><Input id="se-kind" value={f.kind} onChange={(e) => set("kind", e.target.value)} placeholder="Mortgage broker, Ontario" /></div>
            <div className="grid gap-1.5"><Label htmlFor="se-stage">Stage</Label>
              <select id="se-stage" className={pick} value={f.stage} onChange={(e) => set("stage", e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></div>
          </div>

          <fieldset className="grid gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Next move</legend>
            <div className="grid gap-1.5"><Label htmlFor="se-move">The one thing that happens next</Label><Textarea id="se-move" rows={2} value={f.next_move} onChange={(e) => set("next_move", e.target.value)} placeholder="One line, starting with a verb" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label htmlFor="se-owner">Whose move</Label>
                <select id="se-owner" className={pick} value={f.next_owner} onChange={(e) => set("next_owner", e.target.value)}><option value="">Nobody yet</option>{(Object.keys(OWNER_LABEL) as Owner[]).map((o) => <option key={o} value={o}>{OWNER_LABEL[o]}</option>)}</select></div>
              <div className="grid gap-1.5"><Label htmlFor="se-due">By when</Label><Input id="se-due" type="date" value={f.next_due} onChange={(e) => set("next_due", e.target.value)} /></div>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold">The ladder</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {LADDER.map((k) => (
                <div key={k} className="grid gap-1.5"><Label htmlFor={`se-has-${k}`}>{k}</Label>
                  <select id={`se-has-${k}`} className={pick} value={f.has[k] ?? ""} disabled={!!sheet.planned?.[k]} onChange={(e) => set("has", { ...f.has, [k]: e.target.value || undefined })}>
                    <option value="">Not yet</option>{TIERS[k].map((t) => <option key={t} value={t}>{t === "Yes" ? "Has it" : t}</option>)}
                  </select></div>
              ))}
            </div>
            {sheet.planned && <p className="text-xs text-muted-foreground">Greyed-out rungs come from this client&apos;s plan in Clients &gt; Clients. Change them there.</p>}
            <div className="grid gap-1.5"><Label htmlFor="se-offer">The one thing to offer next</Label>
              <select id="se-offer" className={pick} value={offerable.includes(f.next_offer as LadderKey) ? f.next_offer : ""} onChange={(e) => set("next_offer", e.target.value)}><option value="">Nothing right now</option>{offerable.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
            {offerable.includes(f.next_offer as LadderKey) && (
              <div className="grid gap-3">
                <div className="grid gap-1.5"><Label htmlFor="se-what">The offer and its price</Label><Input id="se-what" value={f.offer_what} onChange={(e) => set("offer_what", e.target.value)} placeholder="AI Front Desk, $149 a month" /></div>
                <div className="grid gap-1.5"><Label htmlFor="se-why">Why now</Label><Input id="se-why" value={f.offer_why} onChange={(e) => set("offer_why", e.target.value)} placeholder="What they said or did that makes this the moment" /></div>
                <div className="grid gap-1.5"><Label htmlFor="se-open">How to open the conversation</Label><Input id="se-open" value={f.offer_open} onChange={(e) => set("offer_open", e.target.value)} placeholder="The first sentence you would say" /></div>
              </div>
            )}
          </fieldset>

          <div className="grid gap-1.5"><Label htmlFor="se-know">What we know, one per line</Label><Textarea id="se-know" rows={3} value={f.know} onChange={(e) => set("know", e.target.value)} placeholder="How they like to work, what they care about, what to watch for" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="se-them">Waiting on them, one per line</Label><Textarea id="se-them" rows={3} value={f.them} onChange={(e) => set("them", e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="se-us">Waiting on us, one per line</Label><Textarea id="se-us" rows={3} value={f.us} onChange={(e) => set("us", e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="se-ghl">Link to their GoHighLevel sub-account</Label><Input id="se-ghl" type="url" value={f.ghl_url} onChange={(e) => set("ghl_url", e.target.value)} placeholder="https://app.gohighlevel.com/v2/location/..." /></div>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="sheet-editor">Save sheet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
