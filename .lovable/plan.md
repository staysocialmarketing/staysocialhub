

# Add Task from Projects, Restrict Assignees, Remove Users for Team, Editable Media

## 1. Projects Page — Add Task Button in Expanded View

In `Projects.tsx`, when a project card is expanded, add a `+ Add Task` button below the task list (shown regardless of whether tasks exist). Clicking it opens a small inline dialog pre-filled with `project_id` set to the current project. On save, refresh data so the new task appears immediately.

Also need to add `client_id` auto-linking: when creating a task from within a project, inherit the project's `client_id`.

## 2. Restrict Task Assignees to SS Roles Only

In both `Projects.tsx` and `Tasks.tsx`, filter the users list for assignee dropdowns to only show users with SS roles (`ss_admin`, `ss_producer`, `ss_ops`). Fetch `user_roles` alongside users and filter accordingly — show only Corey, Tristan, and Gavin.

## 3. Remove Admin > Users from Team Sidebar

In `AppSidebar.tsx`, remove the `Users` entry from `teamAdminItems` (line 83). Team members will only see Clients and Media.

## 4. Admin Media — Edit, Archive, Delete

Rewrite `AdminMedia.tsx` to support:
- **Edit**: Click a media card to open a dialog where you can change the post title and reassign the client (via `ClientSelectWithCreate`)
- **Archive**: Button to set `status_column` to `archived` (admin only)
- **Delete**: Button to delete the post entirely (admin only, with confirmation)
- Team members can edit name/client but cannot archive or delete

## Files Changed

| File | Change |
|------|--------|
| `src/pages/team/Projects.tsx` | Add "+ Add Task" button in expanded project, filter assignees to SS roles, inherit client_id |
| `src/pages/team/Tasks.tsx` | Filter assignees to SS roles only |
| `src/components/AppSidebar.tsx` | Remove Users from teamAdminItems |
| `src/pages/admin/AdminMedia.tsx` | Add edit dialog (title, client), archive and delete for admin |

