

# Inline Client Creation + Clickable Admin Clients + Client Linking for Think Tank/Projects/Tasks

## 1. Reusable "Create Client" Inline Option

Create a shared component `ClientSelectWithCreate` that wraps a `Select` dropdown with all existing clients **plus** a "+ New Client" option at the bottom. When selected, it shows inline fields (name input + create button) within the `SelectContent` or opens a small dialog. On creation, it inserts into the `clients` table, refreshes the client list, and auto-selects the new client.

This component will be used in:
- **Projects.tsx** — new project dialog + edit project dialog
- **Tasks.tsx** — new task dialog + edit task dialog (tasks don't have `client_id` yet — see section 4)
- **ThinkTank.tsx** — new item dialog + create project/task from action
- **MakeRequestDialog.tsx** — client select

Only visible to SS roles (team + admin).

## 2. Clickable + Editable Admin Clients

Update `AdminClients.tsx`:
- Make each client card clickable to open an **edit dialog** with fields: name, status, plan, assistants_can_approve
- Add ability to view linked projects, tasks, and think tank items for that client (fetched by `client_id`)
- This gives admins a client-level overview of all activity

## 3. Client Linking on Tasks

The `tasks` table currently has no `client_id` column. Add a migration to add `client_id uuid references clients(id)` to the tasks table. This enables filtering and tracking tasks per client.

## 4. Database Migration

```sql
ALTER TABLE public.tasks ADD COLUMN client_id uuid REFERENCES public.clients(id);
```

## 5. Files Changed

| File | Change |
|------|--------|
| `src/components/ClientSelectWithCreate.tsx` | **New** — reusable client dropdown with "+ New Client" inline creation |
| `src/pages/team/Projects.tsx` | Replace client `Select` with `ClientSelectWithCreate` in create + edit dialogs |
| `src/pages/team/Tasks.tsx` | Add client select to create + edit dialogs using `ClientSelectWithCreate` |
| `src/pages/team/ThinkTank.tsx` | Replace client `Select` with `ClientSelectWithCreate` |
| `src/components/MakeRequestDialog.tsx` | Replace client `Select` with `ClientSelectWithCreate` |
| `src/pages/admin/AdminClients.tsx` | Make cards clickable → edit dialog (name, status, plan); show linked projects/tasks/think tank items |
| Migration | Add `client_id` column to `tasks` table |

