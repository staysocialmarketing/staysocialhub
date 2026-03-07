

# Team Client Access, Dashboard Reorder, and Task Syncing

## Changes

### 1. Team can click clients (read-only linked activity view)

**File: `src/pages/admin/AdminClients.tsx`**

Currently line 309 restricts click to `isSSAdmin`. Change to allow `isSSTeam` to also click, but open a **separate read-only dialog** that only shows linked activity (projects, tasks, requests, think tank) — no edit fields.

- Add `isSSTeam` from `useAuth()`
- On card click: if `isSSAdmin` → open edit dialog (existing). If `isSSTeam` → open a new read-only "Client Details" dialog showing only the linked data section (projects, tasks, think tank) plus requests for that client
- Add requests to the linked data query (`requests` table filtered by `client_id`)

### 2. Admin Dashboard — reorder sections

**File: `src/pages/Dashboard.tsx` — `SuperAdminDashboard`**

Reorder the rendered sections to match priority:
1. Stats cards (keep at top)
2. **Quick Actions** (move from bottom to right after stats)
3. **Recent Client Requests** (move up)
4. **My Tasks** (move up)
5. **Team Activity** (move to bottom)
6. My Assignments (keep below team activity)

### 3. Dashboard task queries — include team-assigned tasks

**File: `src/pages/Dashboard.tsx`**

Both `SuperAdminDashboard` and `TeamDashboard` currently query `myTasks` with `.eq("assigned_to_user_id", profile!.id)`. This misses team-assigned tasks.

Update both queries to use `.or()`:
```
.or(`assigned_to_user_id.eq.${profile!.id},assigned_to_team.eq.true`)
```

Also update the `myTasks.length` stat card count and the "My Tasks" header to reflect the combined count.

### 4. Team Dashboard — same task sync

Keep TeamDashboard layout as-is, but apply the same `.or()` filter for the `myTasks` query so team members see their individual + team tasks on the dashboard.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminClients.tsx` | Allow team click → read-only linked activity dialog with requests |
| `src/pages/Dashboard.tsx` | Reorder admin sections; update myTasks queries to include team tasks |

