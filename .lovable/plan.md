

# Client Hub Consolidation: Media, Activity & Think Tank Actions

## Overview

Three changes: (1) Remove standalone Media Library from admin/team nav and instead access client media via a "Media" button on each client card in AdminClients, (2) Replace inline linked activity with an "Activity" button that opens a dedicated dialog, (3) Fix Think Tank action dialogs to include project/sub-project selectors and client linking.

## 1. Remove Admin Media Library Nav Item, Add Client Media Dialog

**Remove** "Media Library" (`/admin/media`) from `adminSection` in `AppSidebar.tsx`.

**Add** a "Media" button on each client card in `AdminClients.tsx` (next to Strategy, What's New). Clicking it opens a dialog showing that client's published media (posts where `client_id` matches + voice notes from storage). Reuse the same grid/card pattern from `AdminMedia.tsx` but scoped to one client.

- The `AdminMedia.tsx` page and route stay in the codebase for now but are just removed from nav.
- The client media dialog queries `posts` filtered by `client_id` and `status_column IN (published, approved, scheduled)`.
- Include the same edit/download/copy-link actions.
- Client "My Media" (`ContentLibrary.tsx`) stays unchanged -- uploads from there are already linked via `client_id` and will appear in the admin client media dialog.

## 2. Replace Inline Linked Activity with Activity Dialog

Currently `AdminClients.tsx` shows `LinkedActivitySection` inline inside the edit/view dialogs. Replace this with:

- An **"Activity"** button on each client card (alongside Strategy and Media).
- Clicking opens a dialog showing Projects, Tasks, Think Tank items, and Requests for that client.
- Same data as current `LinkedActivitySection` but in its own standalone dialog, not nested inside edit.
- Remove `LinkedActivitySection` from the edit and view client dialogs.

## 3. Fix Think Tank Action Dialogs

### Create Project dialog
Add fields:
- **Client** selector (pre-filled from item's `client_id`)
- **Parent Project** selector (optional, to create as sub-project)

### Create Task dialog
Add fields:
- **Client** selector (pre-filled from item's `client_id`)
- **Project** selector (optional, to link task to project)
- **Priority** selector
- **Assignee** selector (staff only)

Both dialogs need to query `projects` for the selector and pass the selected values into the insert.

## Files Summary

| Action | File |
|--------|------|
| Edit | `src/components/AppSidebar.tsx` — remove Media Library from adminSection |
| Edit | `src/pages/admin/AdminClients.tsx` — add Media + Activity buttons/dialogs, remove inline LinkedActivity |
| Edit | `src/pages/team/ThinkTank.tsx` — enhance Create Project/Task dialogs with selectors |

No database changes needed. All data relationships already exist.

