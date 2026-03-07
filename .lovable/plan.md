

# Default Filter: Show "Mine + Team" for Each User

## Problem
Currently, non-admin users default to seeing only tasks assigned to them individually. Tasks assigned to "Team" don't appear in their default view. The expectation is:
- **Gavin** sees Gavin's tasks + Team tasks by default
- **Tristan** sees Tristan's tasks + Team tasks by default  
- **Corey (Admin)** sees all tasks by default (unchanged)

## Solution

### Tasks Page (`src/pages/team/Tasks.tsx`)

1. **New default filter value**: Change the non-admin default from `profile.id` to a new sentinel value `"mine"` that means "my tasks + team tasks."

2. **Update `fetchTasks`**: When `filterAssignee === "mine"`, run a query with an `.or()` filter:
   ```
   .or(`assigned_to_user_id.eq.${profile.id},assigned_to_team.eq.true`)
   ```

3. **Update filter dropdown**: Add a "Mine + Team" option (set as default for non-admins), keeping "All Assignees" and individual user options available.

### Projects Page (`src/pages/team/Projects.tsx`)

Check if Projects has a similar assignee filter for tasks displayed within projects. If tasks within expanded projects are already showing all project tasks (not filtered by assignee), no change needed there. The "Team" badge display is already handled.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/team/Tasks.tsx` | Default non-admin filter to `"mine"`, add `.or()` query for mine+team, update dropdown |

