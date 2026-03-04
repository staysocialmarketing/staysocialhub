

# Split Kanban Board: Team vs Client View

## The Problem
Currently all 8 columns are visible to everyone. Clients see internal production stages (Content Process, Design Process, etc.) which clutters their view and exposes internal workflow.

## The Solution

### 1. Update the `post_status` enum
The current enum values don't match the new internal workflow. We need to replace them:

**New enum values:**
- `idea` (team only)
- `writing` (team only)
- `design` (team only)
- `internal_review` (team only)
- `client_approval` (visible to both)
- `scheduled` (team only — clients see this as part of "Approved")
- `published` (visible to both)

Plus keep `request_changes` for the client feedback loop, and `approved` for client-approved posts.

**Full enum:** `idea`, `writing`, `design`, `internal_review`, `client_approval`, `request_changes`, `approved`, `scheduled`, `published`

### 2. Database migration
- Add new enum values to `post_status`: `idea`, `writing`, `design`, `internal_review`, `scheduled`
- Migrate existing data: `new_requests` → `idea`, `content_process` → `writing`, `design_process` → `design`, `content_for_approval` → `client_approval`, `in_the_queue` → `scheduled`
- Remove old unused enum values

### 3. Update `Approvals.tsx` — role-based columns

Define two column sets:

```text
TEAM_COLUMNS (SS roles):
  Idea | Writing | Design | Internal Review | Client Approval | Request Changes | Approved | Scheduled | Published

CLIENT_COLUMNS (client roles):
  Client Approval | Approved | Published
```

Use `isSSRole` from `useAuth()` to pick which set to render. Clients simply never see posts in internal stages — those posts don't appear because the columns aren't rendered (and the posts in those statuses won't show in client columns).

### 4. Update drag permissions
- Team: full drag across all columns
- Clients: can only move from "Client Approval" → "Approved" or "Client Approval" → "Request Changes" (same logic as today, just with new enum values)

### 5. Update CalendarView
No changes needed — it filters by `scheduled_at` date regardless of status.

### 6. Update PostDetail, Dashboard, ContentLibrary
- Update any references to old enum values (`new_requests` → `idea`, `content_for_approval` → `client_approval`, etc.)
- Content Library already filters by `published` — no change needed
- Dashboard's "Next Scheduled Posts" — no change needed (filters by `scheduled_at`)

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Alter `post_status` enum, migrate existing data |
| `src/pages/Approvals.tsx` | New column definitions, role-based filtering |
| `src/pages/PostDetail.tsx` | Update status references if any |
| `src/components/approvals/CalendarView.tsx` | Verify no hardcoded status refs |

