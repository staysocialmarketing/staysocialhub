

# Make Platform Versions Editable

## Problem
Published platform versions cannot be edited. If you accidentally publish V1.2 instead of V1.1, there's no way to fix it.

## Changes

### File: `src/pages/admin/AdminVersions.tsx`

1. **Add edit state** -- track which version is being edited (`editingId`)
2. **Add Edit button** to each version card (Pencil icon)
3. **Reuse the existing form** for both create and edit modes:
   - When editing, pre-populate form fields from the selected version
   - Change the save handler to call `.update()` instead of `.insert()` when `editingId` is set
   - Update button label to "Update V..." vs "Publish V..."
4. **Add Delete button** (Trash icon) on each card with confirmation, so incorrect versions can be removed entirely

No database changes needed -- the `platform_versions` table already has an `ALL` policy for `is_ss_role()`, so updates and deletes are permitted.

