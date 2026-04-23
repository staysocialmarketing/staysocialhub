import { describe, it, expect } from "vitest";
import {
  getColumnForView,
  getStatusesForAdminColumn,
  getStatusesForClientColumn,
  ADMIN_WORKFLOW_COLUMNS,
  CLIENT_PIPELINE_COLUMNS,
} from "@/lib/workflowUtils";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

// Every value in the post_status enum
const ALL_STATUSES: PostStatus[] = [
  "idea", "in_progress", "writing", "design", "internal_review",
  "corey_review", "client_approval", "request_changes", "approved",
  "scheduled", "published", "ready_to_send", "sent", "complete",
  "ready_to_schedule", "ai_draft", "ready_for_client_batch",
];

// ── getColumnForView — admin ──────────────────────────────────────────────────

describe("getColumnForView — admin view", () => {
  it("maps idea → new", () => {
    expect(getColumnForView("idea", "admin")).toMatchObject({ key: "new", label: "New" });
  });

  it("maps ai_draft → ai_draft", () => {
    expect(getColumnForView("ai_draft", "admin")).toMatchObject({ key: "ai_draft" });
  });

  it("maps writing → ai_draft (collapsed)", () => {
    expect(getColumnForView("writing", "admin")).toMatchObject({ key: "ai_draft" });
  });

  it("maps design → design", () => {
    expect(getColumnForView("design", "admin")).toMatchObject({ key: "design" });
  });

  it("maps internal_review → corey_review (collapsed)", () => {
    expect(getColumnForView("internal_review", "admin")).toMatchObject({ key: "corey_review" });
  });

  it("maps corey_review → corey_review", () => {
    expect(getColumnForView("corey_review", "admin")).toMatchObject({ key: "corey_review" });
  });

  it("maps request_changes → corey_review (revisions surface here)", () => {
    expect(getColumnForView("request_changes", "admin")).toMatchObject({ key: "corey_review" });
  });

  it("maps ready_for_client_batch → batch_pending with hidden:true", () => {
    const col = getColumnForView("ready_for_client_batch", "admin");
    expect(col).toMatchObject({ key: "batch_pending", hidden: true });
  });

  it("maps client_approval → client_approval with hidden:true", () => {
    const col = getColumnForView("client_approval", "admin");
    expect(col).toMatchObject({ key: "client_approval", hidden: true });
  });

  it("maps approved → ready_to_schedule", () => {
    expect(getColumnForView("approved", "admin")).toMatchObject({ key: "ready_to_schedule" });
  });

  it("maps ready_to_schedule → ready_to_schedule", () => {
    expect(getColumnForView("ready_to_schedule", "admin")).toMatchObject({ key: "ready_to_schedule" });
  });

  it("maps ready_to_send → ready_to_schedule (collapsed)", () => {
    expect(getColumnForView("ready_to_send", "admin")).toMatchObject({ key: "ready_to_schedule" });
  });

  it("maps scheduled → scheduled", () => {
    expect(getColumnForView("scheduled", "admin")).toMatchObject({ key: "scheduled" });
  });

  it("maps published → posted", () => {
    expect(getColumnForView("published", "admin")).toMatchObject({ key: "posted" });
  });

  it("maps sent → posted (collapsed)", () => {
    expect(getColumnForView("sent", "admin")).toMatchObject({ key: "posted" });
  });

  it("maps complete → posted (collapsed)", () => {
    expect(getColumnForView("complete", "admin")).toMatchObject({ key: "posted" });
  });

  it("returns null for in_progress — column removed in Phase 4", () => {
    expect(getColumnForView("in_progress", "admin")).toBeNull();
  });

  it("every non-null admin result has a key and label string", () => {
    for (const status of ALL_STATUSES) {
      const col = getColumnForView(status, "admin");
      if (col !== null) {
        expect(typeof col.key).toBe("string");
        expect(typeof col.label).toBe("string");
      }
    }
  });
});

// ── getColumnForView — client view ────────────────────────────────────────────

describe("getColumnForView — client view", () => {
  it("maps idea → new", () => {
    expect(getColumnForView("idea", "client")).toMatchObject({ key: "new" });
  });

  it("maps ai_draft → in_progress", () => {
    expect(getColumnForView("ai_draft", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps writing → in_progress", () => {
    expect(getColumnForView("writing", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps design → in_progress", () => {
    expect(getColumnForView("design", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps in_progress → in_progress", () => {
    expect(getColumnForView("in_progress", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps internal_review → in_progress", () => {
    expect(getColumnForView("internal_review", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps corey_review → in_progress (revisions not visible to client)", () => {
    expect(getColumnForView("corey_review", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps ready_for_client_batch → in_progress (not yet actionable)", () => {
    expect(getColumnForView("ready_for_client_batch", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps request_changes → in_progress", () => {
    expect(getColumnForView("request_changes", "client")).toMatchObject({ key: "in_progress" });
  });

  it("maps client_approval → for_approval", () => {
    expect(getColumnForView("client_approval", "client")).toMatchObject({ key: "for_approval" });
  });

  it("maps approved → in_queue", () => {
    expect(getColumnForView("approved", "client")).toMatchObject({ key: "in_queue" });
  });

  it("maps ready_to_schedule → in_queue", () => {
    expect(getColumnForView("ready_to_schedule", "client")).toMatchObject({ key: "in_queue" });
  });

  it("maps ready_to_send → in_queue", () => {
    expect(getColumnForView("ready_to_send", "client")).toMatchObject({ key: "in_queue" });
  });

  it("maps scheduled → in_queue", () => {
    expect(getColumnForView("scheduled", "client")).toMatchObject({ key: "in_queue" });
  });

  it("maps published → posted", () => {
    expect(getColumnForView("published", "client")).toMatchObject({ key: "posted" });
  });

  it("maps sent → posted", () => {
    expect(getColumnForView("sent", "client")).toMatchObject({ key: "posted" });
  });

  it("maps complete → posted", () => {
    expect(getColumnForView("complete", "client")).toMatchObject({ key: "posted" });
  });

  it("no client status returns null — every status has a client column", () => {
    for (const status of ALL_STATUSES) {
      expect(getColumnForView(status, "client")).not.toBeNull();
    }
  });

  it("no client column has hidden:true — clients see everything", () => {
    for (const status of ALL_STATUSES) {
      const col = getColumnForView(status, "client");
      expect(col?.hidden).toBeFalsy();
    }
  });
});

// ── Hidden admin statuses ─────────────────────────────────────────────────────

describe("hidden admin statuses", () => {
  const hiddenStatuses: PostStatus[] = ["ready_for_client_batch", "client_approval"];

  it.each(hiddenStatuses)("%s has hidden:true in admin view", (status) => {
    expect(getColumnForView(status, "admin")?.hidden).toBe(true);
  });

  it("visible admin columns have no hidden flag", () => {
    const visibleStatuses: PostStatus[] = [
      "idea", "ai_draft", "writing", "design",
      "internal_review", "corey_review", "request_changes",
      "approved", "ready_to_schedule", "ready_to_send",
      "scheduled", "published", "sent", "complete",
    ];
    for (const status of visibleStatuses) {
      expect(getColumnForView(status, "admin")?.hidden).toBeFalsy();
    }
  });
});

// ── Reverse lookup: getStatusesForAdminColumn ─────────────────────────────────

describe("getStatusesForAdminColumn", () => {
  it("new → [idea]", () => {
    expect(getStatusesForAdminColumn("new")).toEqual(["idea"]);
  });

  it("ai_draft → [ai_draft, writing]", () => {
    expect(getStatusesForAdminColumn("ai_draft").sort()).toEqual(["ai_draft", "writing"].sort());
  });

  it("design → [design]", () => {
    expect(getStatusesForAdminColumn("design")).toEqual(["design"]);
  });

  it("corey_review → [internal_review, corey_review, request_changes]", () => {
    expect(getStatusesForAdminColumn("corey_review").sort())
      .toEqual(["corey_review", "internal_review", "request_changes"].sort());
  });

  it("batch_pending → [ready_for_client_batch]", () => {
    expect(getStatusesForAdminColumn("batch_pending")).toEqual(["ready_for_client_batch"]);
  });

  it("client_approval → [client_approval]", () => {
    expect(getStatusesForAdminColumn("client_approval")).toEqual(["client_approval"]);
  });

  it("ready_to_schedule → [approved, ready_to_schedule, ready_to_send]", () => {
    expect(getStatusesForAdminColumn("ready_to_schedule").sort())
      .toEqual(["approved", "ready_to_schedule", "ready_to_send"].sort());
  });

  it("scheduled → [scheduled]", () => {
    expect(getStatusesForAdminColumn("scheduled")).toEqual(["scheduled"]);
  });

  it("posted → [published, sent, complete]", () => {
    expect(getStatusesForAdminColumn("posted").sort())
      .toEqual(["complete", "published", "sent"].sort());
  });

  it("results are non-empty for every column in ADMIN_WORKFLOW_COLUMNS", () => {
    for (const col of ADMIN_WORKFLOW_COLUMNS) {
      expect(getStatusesForAdminColumn(col.key).length).toBeGreaterThan(0);
    }
  });
});

// ── Phase 6 reminders ─────────────────────────────────────────────────────────

describe("Phase 6 — revision tracking (wired in RequestChangesModal)", () => {
  it("after content fix: request_changes → corey_review, client sees 'In Progress'", () => {
    // RequestChangesModal sends to corey_review for content fixes
    expect(getColumnForView("corey_review", "client")?.key).toBe("in_progress");
  });

  it("after design fix: request_changes → design, client sees 'In Progress'", () => {
    // RequestChangesModal sends to design for design fixes
    expect(getColumnForView("design", "client")?.key).toBe("in_progress");
  });

  it("revision cycle completes: post returns to client_approval → for_approval column", () => {
    // After revisions are addressed, post comes back to client_approval
    expect(getColumnForView("client_approval", "client")?.key).toBe("for_approval");
  });

  it("request_changes is hidden from client pipeline (status_column itself is not a client column)", () => {
    // request_changes maps to in_progress so clients see it — it's not hidden
    expect(getColumnForView("request_changes", "client")?.key).toBe("in_progress");
  });
});

// ── Reverse lookup: getStatusesForClientColumn ────────────────────────────────

describe("getStatusesForClientColumn", () => {
  it("new → [idea]", () => {
    expect(getStatusesForClientColumn("new")).toEqual(["idea"]);
  });

  it("in_progress includes all work-in-flight statuses", () => {
    const result = getStatusesForClientColumn("in_progress").sort();
    const expected: PostStatus[] = [
      "ai_draft", "corey_review", "design", "in_progress",
      "internal_review", "ready_for_client_batch", "request_changes", "writing",
    ];
    expect(result).toEqual(expected.sort());
  });

  it("for_approval → [client_approval]", () => {
    expect(getStatusesForClientColumn("for_approval")).toEqual(["client_approval"]);
  });

  it("in_queue → [approved, ready_to_schedule, ready_to_send, scheduled]", () => {
    expect(getStatusesForClientColumn("in_queue").sort())
      .toEqual(["approved", "ready_to_schedule", "ready_to_send", "scheduled"].sort());
  });

  it("posted → [complete, published, sent]", () => {
    expect(getStatusesForClientColumn("posted").sort())
      .toEqual(["complete", "published", "sent"].sort());
  });

  it("results are non-empty for every column in CLIENT_PIPELINE_COLUMNS", () => {
    for (const col of CLIENT_PIPELINE_COLUMNS) {
      expect(getStatusesForClientColumn(col.key).length).toBeGreaterThan(0);
    }
  });

  it("union of all client column statuses covers every status in ALL_STATUSES", () => {
    const covered = new Set(
      CLIENT_PIPELINE_COLUMNS.flatMap((col) => getStatusesForClientColumn(col.key)),
    );
    for (const status of ALL_STATUSES) {
      expect(covered.has(status), `${status} not covered by any client column`).toBe(true);
    }
  });
});
