

# Workflow Separation and Approval Flow Overhaul

## Overview
Split the current monolithic Approvals page into three distinct experiences: a **Workflow** board for the team's production pipeline, an **Admin Approvals** board with Team + Client sections, and a scoped **Client Approvals** board. Wire up automated status transitions and notifications throughout.

## Current State
- Single `Approvals` page with 9 columns (team) or 3 columns (client)
- `post_status` enum: idea, writing, design, internal_review, client_approval, request_changes, approved, scheduled, published
- No separation between team workflow and approval review

## Architecture

### New Pages & Routes

| Route | Page | Who Sees It | Purpose |
|-------|------|-------------|---------|
| `/workflow` | `Workflow.tsx` | Team + Admin only | Production Kanban: Idea → Writing → Design → Internal Review |
| `/approvals` | `Approvals.tsx` (rewritten) | Admin: 2-section board. Client: scoped 4-column board | Admin reviews team + client approvals. Clients manage their approvals. |

### Sidebar Changes
- Add **Workflow** nav item (clipboard icon) for team/admin, between Dashboard and Approvals
- Client sidebar stays: Dashboard, Approvals, Requests, Content Library, Profile, Plan, What's New

### Workflow Page (Team/Admin only)
- 4 columns: **Idea**, **Writing**, **Design**, **Internal Review**
- Drag-and-drop between columns
- "New Post" creation dialog (existing)
- When a card is dropped into **Internal Review**: trigger notification to admin account
- Posts show client name badge on each card so team knows which client it belongs to

### Approvals Page — Admin View
Two horizontal sections:

**Section 1: Team Approvals** — Posts in `internal_review` status
- Admin reviews team's completed work
- Actions: **Approve** (moves to `client_approval`, notifies client) or **Send Back** (moves back to `design` or `writing`)
- When approved here, card disappears from team's Internal Review column automatically (same status change)

**Section 2: Client Approvals** — Posts in `client_approval`, `request_changes`, `approved`, `published`
- Read-only overview of where all client approvals stand across all clients
- Cards labeled with client name, clickable to PostDetail

### Approvals Page — Client View
4 columns (only their own posts via `client_id` filter):
- **Content for Approval** (`client_approval`)
- **Approved** (`approved`)
- **Request Changes** (`request_changes`)
- **Published** (`published`) — displayed below the top 3 as a tracking section

Client can drag from "Content for Approval" → "Approved" or "Request Changes" only.

### Requests — Scoping
- Client users: already filtered by `profile.client_id` ✓
- Team/Admin: see all client requests with client name prominently displayed, clickable
- Each request card links to client context

### "Make This a Request" Button
Add to Think Tank items, Project cards, and Task cards:
- Button opens a pre-filled Request creation dialog
- Pre-fills topic from the item's title, notes from body/description
- User selects client and submits → creates a request record
- Request automatically creates a post in `idea` status on the Workflow board

### Notification Triggers
Update the existing `notify_on_status_change` database trigger:
- When status changes to `internal_review` → notify all `ss_admin` users
- When status changes to `client_approval` → notify the client's `client_admin` user(s)

### Database Changes
- **Migration**: Update `notify_on_status_change()` trigger function to also notify ss_admin on internal_review and client users on client_approval
- No new tables or enum values needed — existing statuses cover the full flow

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Update `notify_on_status_change` trigger to notify admins on internal_review, clients on client_approval |
| `src/pages/Workflow.tsx` | **New** — Team production Kanban (4 columns) |
| `src/pages/Approvals.tsx` | **Rewrite** — Admin: 2-section approval board. Client: 4-column scoped board |
| `src/components/AppSidebar.tsx` | Add Workflow nav item for team/admin |
| `src/App.tsx` | Add `/workflow` route (AdminRoute protected) |
| `src/pages/team/ThinkTank.tsx` | Add "Make this a Request" button on cards |
| `src/pages/team/Projects.tsx` | Add "Make this a Request" button on cards |
| `src/pages/team/Tasks.tsx` | Add "Make this a Request" button on cards |

## Flow Summary
```text
Client Request / Think Tank → Request Created
                                    ↓
                         Workflow: Idea Board (all team see)
                                    ↓
                         Writing (Tristan) → Design (Gavin)
                                    ↓
                         Internal Review
                                    ↓
                    ┌── Admin Team Approvals ──┐
                    │   Approve    Send Back   │
                    └──────┬──────────────────┘
                           ↓
                    Client Approval Board
                    (client notified)
                           ↓
              ┌── Approved ──┬── Request Changes ──┐
              │              │                      │
              ↓              └──→ back to team ←───┘
           Published
```

