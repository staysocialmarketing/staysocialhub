

# Admin Role Management, Workflow Content Filter, and Team Role Assignment

## Current State
- AdminUsers page is read-only — shows users and their roles but no way to add/remove roles
- Workflow board has no content type filter
- Tristan and Gavin are **not yet registered** in the system (no accounts exist). Only Corey (ss_admin) and a client user exist. They must sign up before roles can be assigned.

## Changes

### 1. Admin Users — Role Management (`src/pages/admin/AdminUsers.tsx`)
- Add a dropdown menu (or popover) on each user card with options to assign/remove roles
- Available roles: `ss_admin`, `ss_producer`, `ss_ops`, `client_admin`, `client_assistant`
- Assign role: insert into `user_roles` table; Remove role: delete from `user_roles` table
- Also add ability to assign/change a user's `client_id` (for client users)
- Use `useQueryClient` to invalidate `admin-users` after mutations
- Add a client assignment dropdown per user card

### 2. Workflow Content Type Filter (`src/pages/Workflow.tsx`)
- Add a `Select` dropdown in the header bar (next to "New Post" button) with options: All, Image, Video, Reel, Carousel
- Filter `columnPosts` by selected content type (or show all when "All" selected)
- State: `const [contentTypeFilter, setContentTypeFilter] = useState<string>("all")`

### 3. Tristan & Gavin Role Assignment
- Since they don't have accounts yet, the role management UI above will let you assign roles once they sign up
- I'll add a note/toast in the UI or mention this clearly — they need to create accounts first (via the Auth page), then an admin assigns `ss_producer` to Tristan and `ss_ops` to Gavin from the new Admin Users role management

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminUsers.tsx` | Add role assign/remove dropdowns, client assignment, mutation logic |
| `src/pages/Workflow.tsx` | Add content type filter dropdown in header, filter cards |

