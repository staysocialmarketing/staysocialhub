

# Expandable Project Folders with Inline Tasks + Dashboard Task Personalization

## 1. Projects Page — Click to Expand, Edit Button Separate

**Current behavior**: Clicking a project card opens the edit dialog. Collapsible only expands for sub-projects.

**New behavior**:
- Clicking a project card **expands/collapses** it inline (always, not just when it has sub-projects)
- When expanded, show: sub-projects (if any) + all linked tasks from the `tasks` table for that project
- Each task row shows title, status, priority, assignee, due date — and is clickable to open the task edit dialog inline
- Add an **Edit** button (pencil icon) on the card header that opens the existing edit dialog (stops propagation so it doesn't toggle expand)
- Tasks within an expanded project should have a quick status toggle and link back to the project context

**Data flow**: Fetch all tasks grouped by `project_id` in a single query on mount (already partially done with `taskCounts`), store full task objects in a `Record<string, Task[]>` map. When a project expands, the tasks are already available.

## 2. Projects Page — Inline Task Edit Dialog

- Reuse the same edit dialog pattern from `Tasks.tsx` (title, description, project, assignee, priority, due date, status)
- When editing a task from within a project expansion, pre-select the current project
- On save, refresh both projects and tasks data

## 3. Dashboard — Personalized Outstanding Tasks

**Current state**: Both SuperAdmin and Team dashboards query `tasks` where `assigned_to_user_id = profile.id` and `status != done`. This already works but only shows when tasks exist.

**Fix**: Always show the "My Tasks" section (even when empty, with a friendly "No outstanding tasks" message). Also show task count in the stat cards at the top alongside Assignments/Overdue/Due Today.

Add a "My Tasks" stat card showing count of non-done tasks assigned to the user, linking to `/team/tasks`.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/team/Projects.tsx` | Refactor: click expands card (not opens edit), show inline tasks list, add Edit button, add inline task edit dialog |
| `src/pages/Dashboard.tsx` | Always show My Tasks section, add task count stat card for SuperAdmin and Team dashboards |

