

# Fix Project Selectors + Make Activity Dialog Interactive

## Two Issues

### 1. Project selector in ThinkTank only shows client-filtered projects
**Bug**: Lines 437-438 and 474-475 filter projects with `!actionClientId || p.client_id === actionClientId`. When a client is selected, projects with `client_id: null` (unlinked projects) are excluded. This hides most projects.

**Fix**: Also include projects where `client_id` is null (shared/unlinked projects):
```
.filter(p => !actionClientId || p.client_id === actionClientId || !p.client_id)
```

### 2. Activity dialog is static — needs to be interactive and navigable

**Current state**: Activity dialog in `AdminClients.tsx` shows plain text rows with status badges. No way to click, edit, or navigate.

**Changes to `AdminClients.tsx`**:

- Fetch more fields per item: `assigned_to_user_id`, `priority`, `project_id` for tasks; `description` for projects
- Make each activity row **clickable** — navigate to the relevant page with pre-filtered client:
  - Projects → `/team/projects` 
  - Tasks → `/team/tasks`
  - Think Tank → `/team/think-tank`
  - Requests → `/requests`
- Add **inline quick-actions** on each row:
  - Tasks: status dropdown (todo/in_progress/done), assignee selector
  - Projects: status dropdown (active/completed/archived)
  - Think Tank: status dropdown (open/actioned/archived)
  - Requests: status badge (view-only, links to request detail)
- Fetch staff users for assignee selector
- Show assigned user initials next to tasks
- Each section header gets a "View All" link that navigates to the filtered page

## Files

| Action | File |
|--------|------|
| Edit | `src/pages/team/ThinkTank.tsx` — fix project filter to include null client_id projects |
| Edit | `src/pages/admin/AdminClients.tsx` — make Activity dialog interactive with inline editing and navigation |

No database changes needed.

