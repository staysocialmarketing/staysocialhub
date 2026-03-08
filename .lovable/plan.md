

# Team Dashboard (Admin Section)

## Overview
Add an internal Team management area under Admin with 5 subpages for team structure, revenue tracking, growth paths, and wins. Admin gets full CRUD; team gets view-only; clients get no access.

## Database

### New table: `team_settings`
Single-row config table for revenue/bonus data:
- `id` uuid PK default gen_random_uuid()
- `monthly_revenue` numeric default 0
- `next_milestone` numeric default 0
- `bonus_pool` numeric default 0
- `updated_at` timestamptz default now()

RLS: SS roles SELECT, ss_admin UPDATE/INSERT.

### New table: `team_roles_config`
Stores role descriptions for each team member:
- `id` uuid PK
- `user_name` text NOT NULL
- `title` text
- `responsibilities` jsonb (array of strings)
- `mission` text
- `sort_order` int default 0
- `updated_at` timestamptz default now()

RLS: SS roles SELECT, ss_admin full manage.

### New table: `team_growth_tracks`
Learning path items:
- `id` uuid PK
- `user_name` text NOT NULL (e.g. "Tristan", "Gavin")
- `track_name` text NOT NULL
- `sort_order` int default 0
- `updated_at` timestamptz default now()

RLS: SS roles SELECT, ss_admin full manage.

### New table: `team_wins`
Monthly wins log:
- `id` uuid PK
- `title` text NOT NULL
- `created_at` timestamptz default now()
- `created_by_user_id` uuid NOT NULL

RLS: SS roles SELECT, ss_admin INSERT/DELETE.

Seed initial data: 3 role entries (Corey, Tristan, Gavin), team_settings row, sample growth tracks.

## New Pages

### `src/pages/admin/TeamDashboard.tsx`
- StatCard for Monthly Revenue, Next Milestone, Bonus Pool
- Progress bar (revenue / milestone)
- "Remaining to milestone" text
- Bonus breakdown (static display from team_settings)
- Links to subpages

### `src/pages/admin/TeamRoles.tsx`
- Card per team member showing name, title, responsibilities list, mission
- Admin: inline edit with save button
- Team: read-only

### `src/pages/admin/TeamRevenue.tsx`
- Editable form (admin only): current revenue, next milestone, bonus pool
- Progress bar + remaining calculation
- Team: read-only display

### `src/pages/admin/TeamGrowth.tsx`
- Grouped by team member name
- List of growth track items
- Admin: add/edit/delete tracks
- Team: read-only

### `src/pages/admin/TeamWins.tsx`
- Chronological list of wins
- Admin: add new win, delete
- Team: read-only

## Navigation Changes

### `src/components/AppSidebar.tsx`
Add "Team Dashboard" to admin section (visible to both ss_admin and ss_team):
```
{ title: "Team", url: "/admin/team", icon: Users }
```
Position it after "Users" in the admin section. Note: this is distinct from the existing "Team" workspace section (Projects/Tasks/Think Tank).

### `src/App.tsx`
Add 5 new AdminRoute routes:
- `/admin/team` → TeamDashboard
- `/admin/team/roles` → TeamRoles
- `/admin/team/revenue` → TeamRevenue
- `/admin/team/growth` → TeamGrowth
- `/admin/team/wins` → TeamWins

## Permissions
- All 5 pages wrapped in `AdminRoute` (requires `isSSRole`)
- Edit controls conditionally rendered based on `isSSAdmin` from AuthContext
- Team members see all data but no edit/add/delete buttons

## Files Summary

| Action | File |
|--------|------|
| Migration | 1 SQL: 4 tables + seed data |
| New | `src/pages/admin/TeamDashboard.tsx` |
| New | `src/pages/admin/TeamRoles.tsx` |
| New | `src/pages/admin/TeamRevenue.tsx` |
| New | `src/pages/admin/TeamGrowth.tsx` |
| New | `src/pages/admin/TeamWins.tsx` |
| Edit | `src/components/AppSidebar.tsx` (add nav item) |
| Edit | `src/App.tsx` (add routes + imports) |

