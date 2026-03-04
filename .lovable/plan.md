

# View As Styling + Team Workspace (Think Tank, Projects, Tasks)

## 1. View As Dropdown Styling Fix
Style the `SelectTrigger` to blend with the sidebar background (transparent/dark) and only show white when opened/focused.

**File:** `src/components/AppSidebar.tsx` — update the SelectTrigger className to use `bg-transparent border-sidebar-border text-sidebar-foreground` instead of the default white.

## 2. Sidebar Navigation Update
Replace the current "Admin" section (for both SS Admin and Team) with a **"Team"** section containing:
- **Think Tank** (`/team/think-tank`) — Ideas, meeting notes, brainstorming
- **Projects** (`/team/projects`) — High-level project tracking with sub-projects
- **Tasks** (`/team/tasks`) — Daily task tracker, detailed view per project

Keep the existing Admin items (Clients, Users, Profile Updates, Content, Add-On Requests) under the same "Team" label for both Admin and Team roles.

**File:** `src/components/AppSidebar.tsx` — add Think Tank, Projects, Tasks to both `superAdminAdminItems` and `teamAdminItems`, rename label to "Team".

## 3. Database — New Tables

### `think_tank_items`
- `id` uuid PK
- `title` text NOT NULL
- `body` text (rich text / markdown)
- `type` text (idea, meeting_note, brainstorm) default 'idea'
- `created_by_user_id` uuid NOT NULL
- `client_id` uuid nullable (optional link to client)
- `project_id` uuid nullable (link to project when actioned)
- `status` text default 'open' (open, actioned, archived)
- `created_at`, `updated_at`

RLS: SS roles only (read/write).

### `projects`
- `id` uuid PK
- `name` text NOT NULL
- `description` text
- `parent_project_id` uuid nullable (self-ref for sub-projects)
- `client_id` uuid nullable
- `status` text default 'active' (active, completed, on_hold, archived)
- `created_by_user_id` uuid
- `created_at`, `updated_at`

RLS: SS roles only.

### `tasks`
- `id` uuid PK
- `title` text NOT NULL
- `description` text
- `project_id` uuid nullable (FK to projects)
- `assigned_to_user_id` uuid nullable
- `status` text default 'todo' (todo, in_progress, done)
- `priority` text default 'normal' (low, normal, high, urgent)
- `due_at` timestamptz nullable
- `created_by_user_id` uuid
- `created_at`, `updated_at`

RLS: SS roles only.

## 4. New Pages

### `src/pages/team/ThinkTank.tsx`
- List of ideas/notes with filters (type, status)
- Create dialog: title, body (textarea), type selector, optional client link
- Cards showing title, type badge, date, creator
- Action button to convert idea → project or task

### `src/pages/team/Projects.tsx`
- Project list with status filters
- Each project card shows name, client (if linked), task count, status
- Click to expand/view sub-projects and tasks
- Create project dialog: name, description, client, parent project

### `src/pages/team/Tasks.tsx`
- Filterable task list (by project, assignee, status, priority)
- Kanban-style or list view with status columns (Todo, In Progress, Done)
- Create task dialog: title, description, project, assignee, priority, due date
- Color-coded priority and due date indicators

## 5. Routing
Add to `App.tsx` inside the protected route block:
- `/team/think-tank` → `ThinkTank`
- `/team/projects` → `Projects`
- `/team/tasks` → `Tasks`

All wrapped in `AdminRoute` (which checks `isSSRole`).

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `think_tank_items`, `projects`, `tasks` tables with RLS |
| `src/components/AppSidebar.tsx` | Fix View As dropdown styling; add Think Tank, Projects, Tasks to Team section; rename label to "Team" |
| `src/pages/team/ThinkTank.tsx` | New — idea/note capture and management |
| `src/pages/team/Projects.tsx` | New — project tracking with sub-projects |
| `src/pages/team/Tasks.tsx` | New — daily task tracker |
| `src/App.tsx` | Add 3 new routes under `/team/*` |

