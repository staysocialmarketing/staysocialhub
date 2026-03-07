

# Version Lightbox, Editable Projects/Tasks, and Think Tank Action Menu

## 1. Version History Lightbox (`PostDetail.tsx`)

Add a lightbox dialog for version thumbnails. When any version row is clicked, open a full-screen dialog showing the creative at large size with version info (number, uploader, date, caption).

- Add state: `lightboxVersion` (the selected version object or null)
- Make each version row `cursor-pointer` with `onClick={() => setLightboxVersion(v)}`
- Render a `Dialog` with `max-w-4xl` containing the full-size image/video and version metadata

## 2. Editable Projects (`Projects.tsx`)

Make project cards clickable to open an edit dialog:

- Add `editProject` state (selected Project or null)
- Add an Edit Dialog with fields: name, description, client, parent project, status
- On save, call `supabase.from("projects").update(...)` and refresh
- Show linked tasks list inside the edit dialog (fetched from `tasks` table where `project_id` matches)
- Each linked task is a clickable link to the Tasks page (or opens inline)

## 3. Editable Tasks (`Tasks.tsx`)

Make task cards clickable to open an edit dialog:

- Add `editTask` state (selected Task or null)
- Add an Edit Dialog with fields: title, description, project (dropdown), assignee, priority, due date, status
- On save, call `supabase.from("tasks").update(...)` and refresh
- Project dropdown links task to a project; changing it updates the relationship

## 4. Think Tank Action Menu (`ThinkTank.tsx`)

Replace the current "Action" button (which just sets status to "actioned") with a dropdown menu offering three choices:

- **Create Project**: Opens a dialog pre-filled with the item's title/body, inserts into `projects` table, then marks item as "actioned"
- **Create Task**: Opens a dialog pre-filled with the item's title/body, inserts into `tasks` table, then marks item as "actioned"
- **Make Request**: Keep existing behavior (opens MakeRequestDialog)

Use a `DropdownMenu` component with three items. Each option opens the appropriate creation dialog pre-filled from the think tank item.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PostDetail.tsx` | Add lightbox dialog for version history items |
| `src/pages/team/Projects.tsx` | Add click-to-edit dialog, show linked tasks |
| `src/pages/team/Tasks.tsx` | Add click-to-edit dialog with project linking |
| `src/pages/team/ThinkTank.tsx` | Replace Action button with dropdown: Create Project, Create Task, Make Request |

