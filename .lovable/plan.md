

# Fix Issues Found in Audit

## Issues to Fix

### 1. CommandPalette: Wrong Success Center route
In `src/components/CommandPalette.tsx` line 94, the client nav item for Success Center uses `path: "/success"` but the actual route in `App.tsx` is `/client/success`.

**Fix:** Change path to `/client/success`.

### 2. CommandPalette: Missing DialogTitle for accessibility
The `CommandDialog` triggers console errors about missing `DialogTitle`. The cmdk `CommandDialog` uses Radix Dialog under the hood but doesn't include a title.

**Fix:** This is inside the shadcn `CommandDialog` wrapper — we need to add a `VisuallyHidden` `DialogTitle` inside the `CommandDialog` usage, or patch the `command.tsx` UI component to include one.

### 3. No code changes needed for the Dashboard Select ref warning
This is a pre-existing issue unrelated to recent changes. Can be addressed separately.

## Files Changed

| File | Change |
|------|--------|
| `src/components/CommandPalette.tsx` | Fix Success Center path from `/success` to `/client/success` |
| `src/components/ui/command.tsx` | Add `VisuallyHidden` `DialogTitle` to `CommandDialog` to fix accessibility warning |

## Security & Data Integrity Summary

- All new tables have proper RLS policies
- Notification dedup prevents duplicate alerts via unique index
- Batch operations correctly check SS role access
- Client data isolation maintained via `is_client_member()` and `can_access_client()`
- No sensitive data exposed; no public-facing tables without auth gating

