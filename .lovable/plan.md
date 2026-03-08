

# Version System Enhancements

## Summary
Connect the existing `platform_versions` table and Admin Versions page to the header, sidebar, and What's New page with role-based filtering, clickable version labels, and colored badges.

## Changes

### 1. `src/components/AppLayout.tsx` — Dynamic header version + click behavior
- Import `useNavigate`, `isSSRole` from auth, and `VersionHistoryDialog`
- Replace the static version fetch with role-aware logic: if `!isSSRole`, add `.eq("visible_to_clients", true)` to the query
- Make the version label a `<button>` that:
  - **Internal users**: opens `VersionHistoryDialog`
  - **Clients**: navigates to `/whats-new#release-notes`
- Add `VersionHistoryDialog` state and render it

### 2. `src/components/AppSidebar.tsx` — Role-aware sidebar version
- Update the existing version fetch (lines 123-135) to use the same role-aware logic: if `!isInternalUser`, filter by `visible_to_clients = true`
- No other sidebar changes needed — click behavior already works correctly

### 3. `src/pages/WhatsNew.tsx` — Colored version badges
- Line 200: Add conditional badge colors — if `minor_version === 0` (major release): orange border/text/bg. Otherwise (minor): blue border/text/bg.

### 4. `src/components/VersionHistoryDialog.tsx` — Colored version badges
- Lines 65-67: Same colored badge logic as What's New for non-latest entries (latest keeps default primary badge)

## Files

| File | Change |
|------|--------|
| `src/components/AppLayout.tsx` | Role-aware version fetch, clickable label, version dialog |
| `src/components/AppSidebar.tsx` | Role-aware version fetch filter |
| `src/pages/WhatsNew.tsx` | Orange/blue badge colors |
| `src/components/VersionHistoryDialog.tsx` | Orange/blue badge colors |

No database changes needed. The existing `platform_versions` table and Admin Versions page already handle publishing, visibility toggle, and "Current" badge correctly.

