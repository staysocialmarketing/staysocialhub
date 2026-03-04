

# Dashboard & Navigation Overhaul

This is a large set of changes spanning the client dashboard, sidebar navigation, and admin media library. Here's the breakdown:

## 1. Client Dashboard Reorder (`src/pages/Dashboard.tsx`)

- Change subtitle from "Here's what's happening with your social content" to "Here's what's happening with your marketing"
- Move **Quick Actions** to the top (right after welcome)
- Remove the **Content Library** stat card (3rd card in the grid — keep only Awaiting Approval + Open Requests)
- Move **Current Plan** card to the very bottom
- Add a **"What's New?"** section below Current Plan showing recommended add-ons filtered by a per-client toggle setting (see DB change below)

## 2. Database: Per-Client "What's New" Toggle

- Add a `whats_new_items` jsonb column (or a new table) to `clients` to let admins toggle which add-ons appear in each client's dashboard What's New section
- Simpler approach: add `whats_new_visible_addons` (jsonb, default `'[]'`) to `clients` table. Admin can toggle individual add-on names per client.

## 3. Admin "What's New" Management

- On the **AdminClients** page, add a section/dialog per client to toggle which add-ons are visible in their "What's New" dashboard widget
- The full What's New page (`/whats-new`) remains unchanged — it always shows all add-ons

## 4. Sidebar Navigation Restructure (`src/components/AppSidebar.tsx`)

**Super Admin sidebar:**
- Menu: Dashboard, Workflow, Approvals, Requests
- Team: Think Tank, Projects, Tasks
- Admin: Clients, Users, Media, Add-On Requests

**Team sidebar:**
- Menu: Dashboard, Workflow, Approvals, Requests
- Team: Think Tank, Projects, Tasks
- Admin (read-only label): Clients, Users, Media *(no editing — handled in components)*
- Remove: Content, Profile Updates, Add-On Requests

**Client sidebar — rename items:**
- "Content Library" → "My Media"
- "Profile" → "My Profile"
- "Plan" → "My Plan"
- Keep: Dashboard, Approvals, Requests, What's New

## 5. Shared Media Library for Admin/Team (`src/pages/admin/AdminMedia.tsx`)

- New page at `/admin/media` showing all client media organized by client name
- Query `posts` with `status_column = 'published'` joined with `clients(name)`, grouped/filtered by client
- Also query `creative-assets` storage bucket organized by client folder
- Read-only for Team role, full access for Admin

## 6. Team Admin Read-Only

- On AdminClients, AdminUsers, and AdminMedia pages, check `isSSAdmin` vs `isSSTeam` to conditionally hide edit/delete/create buttons for team members
- Team can view but not modify

## 7. Route Updates (`src/App.tsx`)

- Add `/admin/media` route pointing to new AdminMedia component
- Keep existing routes, no removals needed

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `whats_new_visible_addons` jsonb column to `clients` |
| `src/pages/Dashboard.tsx` | Reorder client dashboard: Quick Actions top, remove Content Library card, Plan to bottom, add What's New widget |
| `src/components/AppSidebar.tsx` | Restructure all 3 sidebar configs: split Team/Admin sections for super admin, simplify team admin, rename client items |
| `src/pages/admin/AdminMedia.tsx` | New shared media library page organized by client |
| `src/pages/admin/AdminClients.tsx` | Add per-client What's New toggle UI |
| `src/pages/admin/AdminUsers.tsx` | Hide edit controls for team role |
| `src/App.tsx` | Add `/admin/media` route |
| `src/pages/ContentLibrary.tsx` | Update page title to "My Media" |

