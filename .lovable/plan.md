

# Workflow, Approvals, and Auto-Assignment Overhaul

## Summary of Changes

This is a multi-part update to align the app's flow with the intended production pipeline: Requests flow into Workflow → Approvals → Published, with proper auto-assignment at each stage and clear separation between media uploads and published content.

## 1. Database: Update Auto-Assignment Triggers

**Current state**: `auto_create_post_from_request` assigns to `ss_producer`. `auto_reassign_on_design` assigns to `ss_ops`. No trigger for `writing` or `internal_review`.

**Changes (migration)**:
- Update `auto_create_post_from_request` to set `assigned_to_user_id = NULL` (Idea = unassigned)
- Create new trigger `auto_reassign_on_writing`: when status changes to `writing`, auto-assign to `ss_producer`
- Keep `auto_reassign_on_design` as-is (assigns to `ss_ops`)
- Add to `auto_reassign_on_design` trigger (or new trigger): when status changes to `internal_review`, auto-assign to `ss_admin`

All three reassignment rules can live in a single `BEFORE UPDATE` trigger function for simplicity.

## 2. Approvals Page — Separate Media from Published Content

**Client Approvals (`ClientApprovals`)**: 
- Remove `published` from the query filter — Published section should only show posts with `request_id IS NOT NULL` (actual requests, not media uploads)
- Alternatively, only show posts in Published that were moved there by admin approval flow

**Admin Approvals (`AdminApprovals`)**:
- Same fix for Published column — filter to only show posts linked to requests

**Published should only appear when admin explicitly marks approved content as published** — this is already the flow (admin moves from approved → published), so the fix is just filtering the Published display to exclude non-request media.

## 3. Workflow Page — Move Internal Review to Bottom Section

**Current layout**: 4 horizontal kanban columns (Idea, Writing, Design, Internal Review)

**New layout**:
- Top: 3 horizontal kanban columns (Idea, Writing, Design) in the ScrollArea
- Bottom: "Internal Review" as a larger grid section (like Published under Approvals), using `grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

## 4. Admin & Team Dashboards — Show Assignments + Tasks

**SuperAdminDashboard**: Already shows team activity. Add:
- "My Assignments" section showing posts assigned to the current admin user
- "My Tasks" section querying from `tasks` table where `assigned_to_user_id = profile.id`

**TeamDashboard**: Already shows "My Assignments". Add:
- "My Tasks" section querying from `tasks` table where `assigned_to_user_id = profile.id`

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Update `auto_create_post_from_request` (unassign idea), create combined reassignment trigger for writing→producer, design→ops, internal_review→admin |
| `src/pages/Workflow.tsx` | Move Internal Review out of horizontal columns into a bottom grid section |
| `src/pages/Approvals.tsx` | Filter Published section to only show request-linked posts |
| `src/pages/Dashboard.tsx` | Add "My Tasks" section to both Admin and Team dashboards |

