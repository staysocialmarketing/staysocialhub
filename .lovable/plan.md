

# Calendar Date Picker, Project Descriptions, Edit/Delete Permissions, and Task Default Filter

## 1. Calendar Date Picker Component

Create a reusable `DatePickerField` component using Popover + Calendar (shadcn pattern) that replaces all `<Input type="datetime-local">` fields across the app.

- Uses `CalendarIcon` button trigger, opens a full monthly calendar via Popover + Calendar
- Stores selected date as ISO string for compatibility with existing code
- Replace in: Tasks (create + edit + project add-task), Projects (edit task due date), and any other due date fields

**Files**: New `src/components/DatePickerField.tsx`, then update `Tasks.tsx`, `Projects.tsx`

## 2. Projects — Show Description Preview + Sub-projects in Expanded View

Currently the description is shown in the card header (line 328). The sub-projects section already renders when expanded (lines 332-367). Need to verify:
- Description preview is always visible as a brief `line-clamp-2` snippet even when collapsed (already on line 328 — confirmed working)
- Sub-projects are shown when expanded (already working at lines 332-367)

No changes needed here — already implemented. Will verify during implementation.

## 3. Edit + Delete Permissions (Own vs Admin)

Add edit and delete capabilities with ownership rules:
- **Team members** (ss_producer, ss_ops) can edit and delete only items they created (`created_by_user_id === profile.id`)
- **Admin** (ss_admin) can edit and delete all items

Apply to:
- **Tasks** — add Delete button in edit dialog, conditionally shown
- **Projects** — add Delete button in edit dialog, conditionally shown
- **Think Tank** — add Edit dialog (currently missing), add Delete button

Use `isSSAdmin` from `useAuth()` to check admin status. Compare `created_by_user_id` to `profile.id` for ownership.

**Files**: `Tasks.tsx`, `Projects.tsx`, `ThinkTank.tsx`

## 4. Tasks — Default Filter to Current User (Team Only)

Currently `filterAssignee` defaults to `"all"`. Change behavior:
- For **team members** (non-admin): default `filterAssignee` to `profile.id` so they see only their own tasks
- For **admin**: keep default as `"all"` for the birds-eye view

Use `isSSAdmin` from auth context. Initialize `filterAssignee` to `profile?.id` for non-admins once profile loads.

**File**: `Tasks.tsx`

## Files Changed

| File | Change |
|------|--------|
| `src/components/DatePickerField.tsx` | **New** — reusable calendar date picker with Popover + Calendar |
| `src/pages/team/Tasks.tsx` | Replace datetime-local inputs with DatePickerField, add Delete button in edit dialog, default filter to own tasks for team |
| `src/pages/team/Projects.tsx` | Replace datetime-local inputs with DatePickerField, add Delete button in edit dialogs |
| `src/pages/team/ThinkTank.tsx` | Add Edit dialog for items, add Delete capability with ownership check |

