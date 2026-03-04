

# Three Role-Based Experiences

## Role Mapping
- **Super Admin**: `ss_admin` (Corey) — strategic oversight
- **Team**: `ss_producer` + `ss_ops` (Gavin, Tristan) — production workspace
- **Client**: `client_admin` + `client_assistant` — simplified client portal

## AuthContext Changes
Add two new computed booleans:
- `isSSAdmin` — `roles.includes("ss_admin")`
- `isSSTeam` — `roles.includes("ss_producer") || roles.includes("ss_ops")`

`isSSRole` stays as the union of both (for shared permissions like RLS access).

## Sidebar — Role-Based Navigation

**Super Admin sees:**
- Dashboard
- Approvals (full Kanban)
- Requests (all clients)
- Admin: Clients, Users, Profile Updates, Content, Add-On Requests

**Team sees:**
- Dashboard
- Approvals (full Kanban)
- Requests (all clients)  
- Team: Clients, Users, Profile Updates, Content

**Client sees:**
- Dashboard
- Approvals (3-column)
- Requests
- Content Library (with upload)
- Profile
- Plan (new dedicated page)
- What's New / Add-ons

## Dashboard — 3 Variants (same file, conditional rendering)

### Super Admin Dashboard
- **Stats row**: Pending approvals (all clients), Open requests (all clients), Overdue, Due Today
- **Team Activity**: Cards showing what Gavin & Tristan are working on (posts assigned to each, grouped by user). Query `posts` where `assigned_to_user_id` is an ss_producer/ss_ops user, not published.
- **Recent Client Requests**: Latest 10 requests across all clients with client name, type, priority, status
- **Quick Actions**: Create request on behalf of client (opens Requests page with client selector), Review content

### Team Dashboard  
- **Stats row**: My assignments count, Overdue, Due Today, Pending client approvals
- **My Assignments**: Current list (already exists)
- **Client Requests**: Recent incoming requests from all clients
- **Quick Actions**: New Post, Review Content

### Client Dashboard
- Keep current layout mostly as-is
- Remove What's New/Add-ons section (moved to its own page)
- Add Plan summary card with "View Plan →" link
- Keep: Pending approvals, Open requests, Scheduled posts, Quick actions

## New Page: Plan (`src/pages/Plan.tsx`)
- Shows client's current plan name, status, and `includes_json` items as a checklist
- Read-only view of what's included in their package
- Links to What's New for upsells

## Content Library — Upload Button
- Add an "Upload" button (client_admin only) that uploads to `creative-assets` storage and creates a post record with status `published` directly (so it appears in the library)

## Requests — SS Admin Client Selector
- When `isSSAdmin`, show a client dropdown at the top of the create request dialog so Corey can submit on behalf of any client
- The current `profile?.client_id` guard gets relaxed for ss_admin — they pick a client_id from the dropdown

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `isSSAdmin`, `isSSTeam` booleans |
| `src/components/AppSidebar.tsx` | 3 nav configurations based on role type |
| `src/pages/Dashboard.tsx` | 3 dashboard variants with conditional rendering |
| `src/pages/Plan.tsx` | New page — client plan details |
| `src/pages/ContentLibrary.tsx` | Add upload button for client_admin |
| `src/pages/Requests.tsx` | Add client selector for ss_admin |
| `src/App.tsx` | Add `/plan` route |

No database changes needed — all data models already exist.

