

# Clickable Project Links + Enhanced Activity Tracking in Tasks

## Changes

### 1. Clickable Project in TaskDetailDialog (`src/components/TaskDetailDialog.tsx`)

In the read-only meta fields section (lines 357-359), replace the static project name text with a clickable link that navigates to `/team/projects` with the project expanded. Use `useNavigate` from react-router-dom:

```tsx
// Read-only Project field becomes a clickable link
<button onClick={() => { onClose(); navigate("/team/projects"); }}>
  {getProjectName(projectId)}
</button>
```

Style it as a blue underlined link. Apply the same treatment to the project name shown on kanban cards in `Tasks.tsx` (line ~178).

### 2. Enhanced Activity Log — Track Full Task Lifecycle

The current `task_activity_log` only tracks status/assignee/priority changes via the `log_task_changes` trigger. Enhance it to capture origin and lifecycle events:

**a) Log task creation origin** — Update the `auto_create_task_from_request` trigger function to also insert an activity log entry like `"Created from request: {topic}"`. Similarly, when a Think Tank item is converted to a task (this happens in client-side code in ThinkTank.tsx), insert an activity log entry after task creation.

**b) Log project assignment** — In the `log_task_changes` trigger, add tracking for `project_id` changes: `"Linked to project: {name}"`.

**c) Log request generation** — When "Generate Request" is used from a task, insert an activity entry.

**Database migration**: Update the `log_task_changes` function to also track `project_id` changes, and update `auto_create_task_from_request` to log the origin.

**Client-side**: In ThinkTank.tsx where tasks are created from ideas, add an activity log insert. In TaskDetailDialog/Tasks where requests are generated, add an activity log insert.

### 3. Project Detail View — Show Task Sections (Projects.tsx)

Currently the Projects page shows tasks as simple rows. Enhance the expanded project view to show aggregate info from task sub-sections:

- Show total checklist progress across all project tasks (query `task_checklist_items` for all tasks in the project)
- Show total attachments count
- Show recent comments count
- Display these as small stat badges in the project header when expanded

This gives a "full overview" without duplicating the task detail tabs.

## Files

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/TaskDetailDialog.tsx` | Make project name a clickable nav link; log activity on request generation |
| Edit | `src/pages/team/Tasks.tsx` | Make project badge on kanban cards clickable |
| Edit | `src/pages/team/Projects.tsx` | Add task section rollup stats (checklist, files, comments counts) |
| Edit | `src/pages/team/ThinkTank.tsx` | Log activity when converting idea to task |
| Migration | `log_task_changes` function | Track project_id changes |
| Migration | `auto_create_task_from_request` function | Log "created from request" activity entry |

