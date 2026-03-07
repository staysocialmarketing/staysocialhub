

# Stay Social HUB — Admin & Team Role Updates (All-at-Once)

This is a large, interconnected set of changes touching the database, auth context, navigation, dashboards, tasks, marketplace, media, requests, and users. Here is the full implementation plan.

---

## Database Changes (Migration)

### 1. New role: `ss_team` (replaces `ss_producer` + `ss_ops`)
- Add `ss_team` to the `app_role` enum
- Migrate existing `ss_producer` and `ss_ops` role rows to `ss_team`
- Keep old enum values in place (Postgres enums can't remove values easily) but they won't be used going forward

### 2. Workflow preference table
Since you want to keep auto-handoff but with user preferences instead of role-based:
```sql
CREATE TABLE public.workflow_stage_assignments (
  stage text PRIMARY KEY,        -- 'writing', 'design', 'internal_review'
  assigned_user_id uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);
```
- Seed with current defaults (Tristan for writing, Gavin for design, Corey for internal_review)
- Update the `auto_reassign_on_status_change` trigger to look up this table instead of role-based queries

### 3. Add `billing_type` to `marketplace_items`
```sql
ALTER TABLE marketplace_items ADD COLUMN billing_type text DEFAULT 'monthly';
-- Values: 'monthly', 'one_time', 'custom'
```

### 4. Add `assigned_to_user_id` to `requests`
```sql
ALTER TABLE requests ADD COLUMN assigned_to_user_id uuid;
```
- No FK to auth.users (following project convention)

### 5. Update `is_ss_role()` function
Add `ss_team` to the IN clause alongside the old roles (backward compatible).

### 6. Task status expansion
Currently tasks use `text` for status with values `todo`, `in_progress`, `done`. Since it's a text column (not enum), no migration needed — just update the UI to support: `backlog`, `todo`, `in_progress`, `waiting`, `review`, `complete`.

### 7. Enable realtime on `workflow_stage_assignments` (for admin settings)

---

## Auth Context (`src/contexts/AuthContext.tsx`)

- Add `isSSTeam` check to include `ss_team` alongside `ss_producer` and `ss_ops`
- Already done — just verify `ss_team` is included in the checks

---

## Navigation (`src/components/AppSidebar.tsx`)

### Admin nav reorder:
1. Dashboard
2. Clients
3. Requests
4. Projects
5. Tasks
6. Media Library
7. Marketplace
8. Users

### Team nav:
Same as admin minus Users (already excluded). Reorder to match admin flow.

Remove "Workflow" and "Approvals" from being separate top-level items for admin/team — fold into the new order. Actually, keeping Workflow and Approvals since those are the production Kanban. The new order:
1. Dashboard
2. Workflow
3. Approvals
4. Clients (view-only for team)
5. Requests
6. Projects / Tasks / Think Tank (Team section)
7. Media Library
8. Marketplace
9. Users (admin only)

---

## Task Statuses (`src/pages/team/Tasks.tsx`)

Update `statusColumns` and `statusLabels`:
```
backlog → Backlog
todo → To Do
in_progress → In Progress
waiting → Waiting
review → Review
complete → Complete
```

Update all status `<Select>` dropdowns in create/edit dialogs, inline status changers, and the kanban columns. Change `neq("status", "done")` queries to `neq("status", "complete")` across Dashboard and Tasks.

---

## Marketplace (`src/pages/admin/AdminMarketplace.tsx`)

### Rename tabs:
- Solutions → Plans
- Upgrades → Upgrades (keep)
- Client Requests → Client Requests (keep)

### Add `billing_type` field to create/edit dialog:
- Options: Monthly, One-Time, Custom
- Display on cards alongside price

### Permission enforcement:
- Team can view all items but cannot see create/edit/delete buttons
- Already partially done with `isSSAdmin` checks — extend to ensure team sees content but no edit controls

### Convert to Upgrade action:
- On Client Requests tab, add a "Convert to Upgrade" button per row (admin only)
- Creates a new marketplace item with category "upgrade" pre-filled from the request

---

## Request Assignment (`src/pages/Requests.tsx` + `RequestDetailDialog.tsx`)

### Requests list:
- Show "Assigned To" column for SS roles
- Add assignment dropdown in RequestDetailDialog (SS Admin can assign, team can view)

### Display fields:
- Assigned User, Status, Priority (already showing status/priority)

---

## Media Library (`src/pages/admin/AdminMedia.tsx` + `src/pages/ContentLibrary.tsx`)

### Add filters:
- Client filter (already exists in AdminMedia)
- Media type filter: All / Images / Videos / Documents

### Per-item actions:
- Download button (triggers file download)
- Copy Link button (copies public URL to clipboard)

---

## Users Page (`src/pages/admin/AdminUsers.tsx`)

### Multi-client assignment:
The current schema has `users.client_id` as a single FK. For multi-client, we need a junction table:
```sql
CREATE TABLE public.user_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(user_id, client_id)
);
ALTER TABLE user_client_assignments ENABLE ROW LEVEL SECURITY;
```

**Important tradeoff**: This is a significant schema change. The existing `users.client_id` is used extensively in RLS policies (`is_client_member`, `get_my_client_id`, `can_access_client`). Changing to multi-client means rewriting all these security functions. This is high-risk.

**Recommendation**: Defer multi-client to a future version. For V1, keep single client assignment but note this as a V2 feature. The current single-client model is safe and functional.

---

## Team Dashboard (`src/pages/Dashboard.tsx` — TeamDashboard)

Reorder to show:
1. Stats (My Tasks, My Assignments, Overdue, Due Today, Pending Approvals)
2. My Tasks (already synced with Mine+Team)
3. My Assignments (post assignments)
4. Client Requests
5. Quick Actions

---

## Files Changed Summary

| File | Changes |
|------|---------|
| **Migration SQL** | Add `ss_team` role, `workflow_stage_assignments` table, `billing_type` column, `assigned_to_user_id` on requests, update triggers |
| `src/contexts/AuthContext.tsx` | Include `ss_team` in `isSSTeam` check |
| `src/components/AppSidebar.tsx` | Reorder nav for admin and team |
| `src/pages/team/Tasks.tsx` | 6-column kanban (backlog/todo/in_progress/waiting/review/complete) |
| `src/pages/Dashboard.tsx` | Update status filters from `done`→`complete`, reorder team dashboard |
| `src/pages/admin/AdminMarketplace.tsx` | Rename Solutions→Plans, add billing_type field, team view-only, convert-to-upgrade action |
| `src/pages/Requests.tsx` | Show assigned_to column, enable assignment |
| `src/components/RequestDetailDialog.tsx` | Add assignment dropdown |
| `src/pages/admin/AdminMedia.tsx` | Add media type filter, download/copy-link buttons |
| `src/pages/ContentLibrary.tsx` | Add media type filter, download/copy-link buttons |
| `src/pages/admin/AdminUsers.tsx` | Update role labels (SS Team), remove old role options |

### Deferred to V2:
- Multi-client user assignment (requires RLS rewrite)
- Request → Task auto-creation is already implemented via the `auto_create_post_from_request` trigger (creates a post in the workflow). If you want requests to also create entries in the `tasks` table, that's a separate trigger we can add, but the current flow already works: Request → Post (Idea) → Workflow.

