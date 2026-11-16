import { describe, expect, it } from "vitest";
import { ASKS, blankSheet, dueText, ladderCounts, loopsFrom, rungOf, sheetKey, sortSheets, toSheet, withPlan, type Sheet } from "@/lib/clientSheet";

const today = new Date(2026, 10, 16);
const sheet = (over: Partial<Sheet>): Sheet => ({ ...blankSheet({ id: "c", name: "Client" }), id: "s", ...over });
const ask = (key: string) => ASKS.find((a) => a.key === key)!;

describe("client sheet rules", () => {
  it("words the due date the way a person would", () => {
    expect(dueText("2026-11-13", today)).toBe("3 days late");
    expect(dueText("2026-11-15", today)).toBe("1 day late");
    expect(dueText("2026-11-16", today)).toBe("Today");
    expect(dueText("2026-11-17", today)).toBe("Tomorrow");
    expect(dueText("2026-11-20", today)).toBe("In 4 days");
    expect(dueText("2026-12-02", today)).toBe("Dec 2");
    expect(dueText(null, today)).toBe("No date");
  });

  it("counts a move as this week only when it is dated, open and not on hold", () => {
    expect(ask("week").test(sheet({ next_move: "Call", next_due: "2026-11-13" }), today)).toBe(true);
    expect(ask("week").test(sheet({ next_move: "Call", next_due: "2026-11-22" }), today)).toBe(true);
    expect(ask("week").test(sheet({ next_move: "Call", next_due: "2026-11-23" }), today)).toBe(false);
    expect(ask("week").test(sheet({ next_move: "Call", next_due: null }), today)).toBe(false);
    expect(ask("week").test(sheet({ next_move: "Call", next_due: "2026-11-13", stage: "hold" }), today)).toBe(false);
    expect(ask("unset").test(sheet({ next_move: null }), today)).toBe(true);
    expect(ask("unset").test(sheet({ next_move: null, stage: "hold" }), today)).toBe(false);
  });

  it("sorts late and dated moves first, on hold last", () => {
    const names = sortSheets([
      sheet({ name: "Hold", stage: "hold", next_move: "Check in", next_due: "2026-11-01" }),
      sheet({ name: "Nothing" }),
      sheet({ name: "Undated", next_move: "Ask" }),
      sheet({ name: "Later", next_move: "Ask", next_due: "2026-11-30" }),
      sheet({ name: "Late", next_move: "Ask", next_due: "2026-11-10" }),
    ]).map((s) => s.name);
    expect(names).toEqual(["Late", "Later", "Undated", "Nothing", "Hold"]);
  });

  it("counts the ladder, never counting a rung as next when the client already has it", () => {
    const c = ladderCounts([
      sheet({ has: { Site: "Custom", Studio: "One" }, next_offer: "Front Desk" }),
      sheet({ has: { Studio: "Yes" }, next_offer: "Studio" }),
      sheet({ has: {}, next_offer: "Front Desk" }),
    ]);
    expect(c.Studio).toEqual({ has: 2, next: 0 });
    expect(c["Front Desk"]).toEqual({ has: 0, next: 2 });
    expect(c.Site).toEqual({ has: 1, next: 0 });
  });

  it("keeps the start date of a loop that did not change and dates a new one today", () => {
    const loops = loopsFrom("Headshot\nNew thing", "Quote", [{ side: "them", text: "Headshot", since: "2026-11-04" }], "2026-11-16");
    expect(loops).toEqual([
      { side: "them", text: "Headshot", since: "2026-11-04" },
      { side: "them", text: "New thing", since: "2026-11-16" },
      { side: "us", text: "Quote", since: "2026-11-16" },
    ]);
  });

  it("reads a loosely written row without breaking", () => {
    const s = toSheet({ id: "1", name: "X", stage: "nonsense", has: { Site: "Lite", Bogus: "Yes", HUB: "" }, next_offer: "Email", know: ["a", 3, ""], loops: [{ side: "us", text: "t" }, "junk"], confirmed: null });
    expect(s.stage).toBe("steady");
    expect(s.has).toEqual({ Site: "Lite" });
    expect(s.next_offer).toBeNull();
    expect(s.know).toEqual(["a"]);
    expect(s.loops).toEqual([{ side: "us", text: "t", since: null }]);
    expect(s.confirmed).toBe(false);
  });

  it("lets the plan record win over the sheet's own ladder, and drops an offer the client already has", () => {
    expect(rungOf("Studio Team")).toEqual(["Studio", "Team"]);
    expect(rungOf("Sites Lite")).toEqual(["Site", "Lite"]);
    expect(rungOf("AI Front Desk")).toEqual(["Front Desk", "Yes"]);
    expect(rungOf("Brokerage Command")).toBeNull();
    const s = withPlan(sheet({ has: { Studio: "Yes", Site: "Custom" }, next_offer: "Front Desk" }), { Studio: "One", "Front Desk": "Yes" });
    expect(s.has).toEqual({ Studio: "One", Site: "Custom", "Front Desk": "Yes" });
    expect(s.next_offer).toBeNull();
    expect(withPlan(sheet({ next_offer: "Reviews" }), {}).next_offer).toBe("Reviews");
  });

  it("keeps the same key for a client before and after its sheet is first saved", () => {
    const blank = blankSheet({ id: "abc", name: "Client" });
    expect(sheetKey(blank)).toBe(sheetKey({ ...blank, id: "row-1" }));
    expect(sheetKey(sheet({ client_id: null, id: "row-2" }))).toBe("sheet:row-2");
  });
});
