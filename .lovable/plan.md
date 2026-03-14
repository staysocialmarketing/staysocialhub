

# Marketing Calendar System

## Overview

Add a new `/calendar` page as the primary planning view for scheduled content. It queries `posts` directly (no new tables needed) and provides three sub-views: Calendar, List, and Board — all with filtering by client, platform, status, and assignee.

## No Database Changes

All data already exists in the `posts` table (`scheduled_at`, `status_column`, `platform`, `client_id`, `assigned_to_user_id`, `creative_url`, `caption`, `title`). No migration needed.

## Files to Create/Modify

### New: `src/pages/MarketingCalendar.tsx`

Main page with three tab views (Calendar / List / Board) using the existing `Tabs` component.

- **Query**: Fetch all posts with `scheduled_at IS NOT NULL` OR status in approval pipeline stages, joined with `clients(name)` and `assigned_user:assigned_to_user_id(name)`
- **Filters**: Reuse `FilterBar` component with configs for client, platform, status (the 6 approval pipeline statuses), and assigned team member
- **Status badges** use color coding matching the approval pipeline:
  - `internal_review` → "Awaiting Internal Review"
  - `corey_review` → "Awaiting Corey Review"
  - `ready_for_client_batch` → "Ready for Client Batch"
  - `client_approval` → "Awaiting Client Approval"
  - `scheduled` / `ready_to_schedule` → "Approved / Scheduled"
  - `published` → "Published"

**Calendar Tab**: Reuse and extend the existing `CalendarView` component pattern — month grid with post dots, click to expand day detail showing preview image, caption, client, platform, date, status badge.

**List Tab**: Table view using existing `Table` components. Columns: preview thumbnail, title, client, platform, publish date, status badge, assignee.

**Board Tab**: Kanban columns grouped by status (the 6 pipeline stages), each card showing preview image, title, client badge, platform badge, date.

Each content card across all views shows:
- Preview image (or placeholder)
- Caption preview (truncated)
- Client name
- Platform badge(s)
- Publish date
- Status badge
- Clicking navigates to `/approvals/:postId`

### Modify: `src/App.tsx`

Add route: `<Route path="/calendar" element={<AdminRoute><MarketingCalendar /></AdminRoute>} />`

### Modify: `src/components/AppSidebar.tsx`

Add calendar entry to `menuSection` between Workflow and Approvals:
```
{ title: "Calendar", url: "/calendar", icon: Calendar }
```

Import `Calendar` from lucide-react (already imported as `CalendarIcon` pattern exists).

## Implementation Notes

- No changes to request or approval workflows
- Posts without `scheduled_at` still appear if they're in an approval pipeline status (so nothing is hidden)
- Filters use the same `useFilterBar` hook with session storage key `"calendar"`
- Board view cards are read-only (no drag-and-drop — that stays in Workflow)

