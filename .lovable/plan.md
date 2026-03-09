

# Fix: Task Click in Projects Opens Edit Instead of Detail View

## Problem
When clicking a task under a project, it immediately opens the **Edit Task** dialog (a raw form with all fields editable). The expected behavior is to open the **TaskDetailDialog** in read-only mode first, where users can view all task details (description, checklist, attachments, comments, activity) and only enter edit mode by clicking the Edit button.

## Root Cause
In `src/pages/team/Projects.tsx` line 286, the task row click handler calls `openEditTask(task)`, which opens a basic edit form dialog (lines 577-670). The rich `TaskDetailDialog` component (with tabs, read-only mode, and edit toggle) is not used at all on this page.

## Fix
**File: `src/pages/team/Projects.tsx`**

1. Import `TaskDetailDialog` component
2. Add a `selectedTask` state (replaces `editTask` for click-to-view)
3. Change `renderTaskRow` click handler from `openEditTask(task)` to `setSelectedTask(task)`
4. Add `TaskDetailDialog` to the JSX, passing the required props (`projects`, `ssUsers`, `users`)
5. Keep the existing Edit Task dialog but only trigger it from the TaskDetailDialog's edit flow (or remove it entirely since TaskDetailDialog handles editing internally)

The existing edit-only dialog (lines 577-670) can be removed since `TaskDetailDialog` already handles editing with its built-in Edit button, save, and delete functionality.

## Changes Summary

| Change | Detail |
|--------|--------|
| Add import | `TaskDetailDialog` from `@/components/TaskDetailDialog` |
| Add state | `selectedTask` to track which task to show in detail view |
| Update click handler | `renderTaskRow` onClick → `setSelectedTask(task)` instead of `openEditTask(task)` |
| Add component | Render `<TaskDetailDialog>` with task, projects, ssUsers, users props |
| Remove dead code | Remove the inline Edit Task dialog and related `editTask*` state variables, since `TaskDetailDialog` handles all of this |

