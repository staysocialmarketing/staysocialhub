

# Make Card Dialogs Read-Only by Default

## Problem
WorkflowCardDialog and TaskDetailDialog open in edit mode immediately — inputs are live and editable on open. RequestDetailDialog already has the correct pattern (read-only view with an "Edit" button).

## Changes

### 1. `src/components/WorkflowCardDialog.tsx`
- Add `editing` state, default `false`
- **Read-only view**: Display title, caption, content type, due date, assigned user, reviewer as plain text/badges
- Show approval actions (already there) and linked request info in read-only mode
- Add an "Edit" button that switches to the current editable form
- "Save" returns to read-only mode; "Cancel" discards changes
- Keep "Full View" button visible in both modes

### 2. `src/components/TaskDetailDialog.tsx`
- Add `editing` state, default `false`
- **Read-only view**: Show all meta fields (status, priority, due date, client, project, assignee) as plain text instead of Select/Input components
- Tabs (description, checklist, attachments, comments, activity) remain interactive in read-only mode (users should still be able to add comments, toggle checklist items)
- Add "Edit" button (visible when `canEdit` is true) to switch meta fields + title + description to editable inputs
- "Save" / "Cancel" buttons in edit mode

### Pattern (matching RequestDetailDialog)
- Dialog opens → read-only summary
- User clicks "Edit" → form inputs appear
- Save or Cancel → back to read-only

No database changes needed.

