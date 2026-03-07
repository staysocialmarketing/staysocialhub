

# Workflow and Approval Flow Overhaul

## Current State

The `post_status` enum has: `idea`, `writing`, `design`, `internal_review`, `client_approval`, `request_changes`, `approved`, `scheduled`, `published`.

The Workflow board shows 3 columns (Idea, Writing, Design) + Internal Review grid. The Approvals page uses drag-and-drop with limited action buttons.

## Strategy

Reuse existing enum values where possible. Map `idea` → "New" in UI. Add `in_progress` to the enum. Stop using `writing`, `design`, `request_changes`, `approved` as active workflow stages (they remain in the enum but are unused going forward).

New flow: **New → In Progress → Internal Review → Client Approval → Scheduled → Published**

When "Request Changes" is clicked, card goes back to "In Progress" (no separate `request_changes` status needed — feedback is stored as a comment).

---

## Database Migration

1. **Add `in_progress` to `post_status` enum**
2. **Migrate existing data**: Move `writing`/`design` posts to `in_progress`, `request_changes` to `in_progress`, `approved` to `scheduled`
3. **Update `auto_create_post_from_request` trigger** to insert with `status_column = 'idea'` (already does this — "idea" = "New")
4. **Update `auto_reassign_on_status_change` trigger** to handle `internal_review` → assign to admin via workflow_stage_assignments

---

## New Component: `RequestChangesModal`

A dialog that opens when "Request Changes" is clicked (by Admin or Client). Contains:
- Checkbox options: "Design change", "Content / caption change", "Other / leave note"
- Text area (shown when "Other" is selected, or always available)
- On submit: saves feedback as a comment on the post, moves post to `in_progress`

---

## Workflow Page (`src/pages/Workflow.tsx`)

Restructure columns to: **New, In Progress, Internal Review, Client Approval, Scheduled, Published**

- Top kanban: New, In Progress, Internal Review, Client Approval (horizontal scroll)
- Bottom sections: Scheduled + Published grids
- Cards in "Internal Review" show **Approve** and **Request Changes** buttons (Admin only)
- "Approve" moves to `client_approval`; "Request Changes" opens the modal and moves to `in_progress`
- Keep drag-and-drop as secondary interaction
- Cards remain clickable to open `WorkflowCardDialog`

---

## Approvals Page (`src/pages/Approvals.tsx`)

**Admin view**: Simplified to show:
- "Awaiting Internal Review" section with Approve / Request Changes buttons per card
- "Client Approval" read-only overview
- Scheduled and Published sections

**Client view**: 
- "Content for Approval" column with **Approve** and **Request Changes** buttons per card
- "Approved" moves to `scheduled`
- "Request Changes" opens modal, moves to `in_progress`
- Scheduled + Published sections below

Both views use the same `RequestChangesModal` and same button pattern.

---

## Dashboard Updates (`src/pages/Dashboard.tsx`)

**Admin/Team `WorkQueueDashboard`**:
- "Approvals Waiting" stat: count posts in `internal_review` (for admin) + `client_approval`
- Add "Items returned for changes" — posts recently moved back to `in_progress` that are assigned to current user
- "Ready to Schedule" — posts in `scheduled` status

**Client `ClientDashboard`**:
- "Awaiting Approval" count: posts in `client_approval`
- Add "Scheduled" count
- "Published" count

---

## Files Changed

| File | Change |
|------|--------|
| **Migration SQL** | Add `in_progress` to enum, migrate existing data, update triggers |
| **`src/components/RequestChangesModal.tsx`** | New component — structured feedback modal |
| **`src/pages/Workflow.tsx`** | New 6-stage columns, approval action buttons on cards |
| **`src/pages/Approvals.tsx`** | Action-based approve/request changes buttons, remove drag-and-drop dependency |
| **`src/pages/Dashboard.tsx`** | Update stats queries for new statuses, add scheduled/returned sections |
| **`src/components/WorkflowCardDialog.tsx`** | Add approve/request changes actions in detail view for mobile |

---

## Technical Notes

- The `workflow_stage_assignments` table + `auto_reassign_on_status_change` trigger already handles auto-assignment when status changes — this continues to work with the new flow
- Comments table already supports `post_id` — feedback from "Request Changes" will be stored as comments
- The `approvals` table (with `approval_type` enum: approve, approve_with_notes, request_changes) will be used to record formal approval actions for audit trail
- Mobile: action buttons render directly on cards (not just on hover), ensuring drag-and-drop is never required

