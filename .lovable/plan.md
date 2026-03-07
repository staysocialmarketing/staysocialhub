

# Marketplace System, "Team" Assignee, Project Task Rollup

This is a large change touching database schema, a new admin page, client dashboard CTA, the What's New page, assignee logic, and project task display. Here's the full plan:

## 1. Database: New `marketplace_items` Table

Create a catalog table for admin-managed services:

```sql
CREATE TABLE public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'upgrade', -- 'solution' or 'upgrade'
  icon text,
  price text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items" ON public.marketplace_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "SS can manage items" ON public.marketplace_items
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());
```

## 2. Database: Add `recommended_item_id` to Clients

```sql
ALTER TABLE public.clients
  ADD COLUMN recommended_item_id uuid REFERENCES public.marketplace_items(id);
```

Admin can set a recommended upsell per client. If null, the client's What's New page and dashboard CTA default to the most recently created active marketplace item.

## 3. Database: Support "Team" Assignee

Add a special `assigned_to_team` boolean column on tasks (rather than creating a fake user):

```sql
ALTER TABLE public.tasks ADD COLUMN assigned_to_team boolean NOT NULL DEFAULT false;
```

When `assigned_to_team` is true, the task shows "Team" as the assignee label and is visible to all SS users regardless of individual filter. The individual `assigned_to_user_id` stays null.

## 4. Admin Marketplace Page (replaces Add-On Requests)

Rename `AdminAddonRequests.tsx` to `AdminMarketplace.tsx`. This page has two tabs:

**Tab 1 — Solutions**: CRUD for `marketplace_items` where `category = 'solution'`. Admin can add/edit/delete done-for-you plans. Each item has name, description, icon, price. Per-client visibility is managed via existing `whats_new_visible_addons` (rename concept to use item IDs instead of hardcoded addon name strings).

**Tab 2 — Upgrades**: CRUD for `marketplace_items` where `category = 'upgrade'`. These are upsell highlights of higher-tier plans within existing solutions.

**Tab 3 — Client Requests**: The existing addon_requests table display (recent client requests for services).

The admin can also set which items are visible per client (via the existing What's New toggle on AdminClients, updated to use marketplace_items instead of hardcoded names).

## 5. Update Sidebar

- Rename "Add-On Requests" to "Marketplace" in `superAdminAdminItems`
- Add "Marketplace" to `teamAdminItems` (visible to team, read-only — team can view but only admin can edit)
- Update route from `/admin/addon-requests` to `/admin/marketplace`

## 6. Client What's New Page

Replace hardcoded `addons` array with data from `marketplace_items`. Show two sections:
- **Recommended** (highlighted): The client's `recommended_item_id` item, or the most recent active item if none set
- **Solutions**: Items with `category = 'solution'` visible to this client
- **Upgrades**: Items with `category = 'upgrade'` visible to this client

Clients can still click "Request" which inserts into `addon_requests`.

## 7. Client Dashboard CTA

At the bottom of `ClientDashboard`, add a CTA card showing the recommended item (from `recommended_item_id` or most recent) + the most recently added marketplace item beside it. Links to `/whats-new`.

## 8. "Team" Assignee Option

In all assignee dropdowns (Tasks.tsx, Projects.tsx add-task), add a "Team" option above individual names. When selected:
- Set `assigned_to_team = true` and `assigned_to_user_id = null`
- Display "Team" badge instead of individual name
- Task appears for all SS users in their task lists

## 9. Project Folder — Show All Active Tasks Including Sub-project Tasks

When a project is expanded, the "Tasks" section will show:
- Direct tasks (`project_id = project.id`)
- Tasks from sub-projects (aggregated)
- Each sub-project section also shows its own tasks

Add a summary count like "12 tasks (4 direct, 8 in sub-projects)" in the project header.

## 10. Update AdminClients What's New Toggle

Replace the hardcoded `ALL_ADDONS` array with marketplace_items fetched from the database. The toggle dialog lets admin select which items are visible per client + set the recommended item.

## Files Changed

| File | Change |
|------|--------|
| Migration | Create `marketplace_items` table, add `recommended_item_id` to clients, add `assigned_to_team` to tasks |
| `src/pages/admin/AdminMarketplace.tsx` | **New** — replaces AdminAddonRequests with 3-tab layout (Solutions, Upgrades, Requests) |
| `src/pages/admin/AdminAddonRequests.tsx` | **Delete** — replaced by AdminMarketplace |
| `src/components/AppSidebar.tsx` | Rename sidebar entry, add Marketplace to team items |
| `src/App.tsx` | Update route from `/admin/addon-requests` to `/admin/marketplace` |
| `src/pages/WhatsNew.tsx` | Fetch from marketplace_items, show Recommended + Solutions + Upgrades sections |
| `src/pages/Dashboard.tsx` | Add CTA card to ClientDashboard with recommended + newest item |
| `src/pages/admin/AdminClients.tsx` | Update What's New toggle to use marketplace_items, add recommended_item_id picker |
| `src/pages/team/Tasks.tsx` | Add "Team" assignee option, handle `assigned_to_team` flag |
| `src/pages/team/Projects.tsx` | Add "Team" assignee option, show sub-project tasks in parent rollup |

