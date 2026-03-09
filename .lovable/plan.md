

# Task & Project Editing Permissions + Default Filter Fix

## Changes

### 1. Tasks page: Default filter for team members → "Mine" (already partially done)
The current code at line 96-101 in `Tasks.tsx` checks `!isSSAdmin` and sets to "mine", but `isSSAdmin` only covers admins. Need to also pull `isSSTeam` from auth context and use `isSSRole` — the intent is: SS Admins see "all" by default, team members see "mine". The current logic is correct since `!isSSAdmin` catches team members. However, the "all" option should be available for team members to switch to. This is already working — no change needed here.

**Actually**: Looking more carefully, the filter options include individual assignees and "all" implicitly via the FilterBar. The default logic is correct. No change needed.

### 2. Projects page: Allow SS Team to edit projects and rename
Currently `canEditDeleteProject` (line 100) only allows `isSSAdmin` or the creator. Need to also allow `isSSTeam` roles.

**File: `src/pages/team/Projects.tsx`**
- Import `isSSTeam` from `useAuth()` (line 63)
- Update `canEditDeleteProject` to: `isSSAdmin || isSSTeam || p.created_by_user_id === profile?.id`
- Same for `canEditDeleteTask`

### 3. TaskDetailDialog: Allow SS Team to edit tasks (rename, etc.)
Currently `canEdit` (line 95) only allows `isSSAdmin` or creator. Need to include `isSSRole` (which covers all SS roles).

**File: `src/components/TaskDetailDialog.tsx`**
- Change line 95: `const canEdit = task ? (isSSRole || task.created_by_user_id === profile?.id) : false;`
- This uses `isSSRole` which already includes ss_admin, ss_team, ss_producer, ss_ops

### Summary

| File | Change |
|------|--------|
| `src/pages/team/Projects.tsx` | Import `isSSTeam`, update `canEditDeleteProject` and `canEditDeleteTask` to include SS Team |
| `src/components/TaskDetailDialog.tsx` | Change `canEdit` from `isSSAdmin` to `isSSRole` so all team members can edit/rename tasks |

