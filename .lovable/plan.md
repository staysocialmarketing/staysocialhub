

# Add Clickable Version Badge to Sidebar + Version History Dialog

## Changes

### 1. Sidebar Footer — Version Badge (`src/components/AppSidebar.tsx`)
- Fetch latest `platform_versions` row (same query as `AppLayout.tsx`)
- Display `Stay Social HUB V{major}.{minor}` between the user email and Sign Out button
- Make it clickable:
  - **Client users**: Navigate to `/whats-new` (scroll to release notes section)
  - **Internal users (team/admin)**: Open a `Dialog` showing full version history

### 2. Version History Dialog (`src/components/VersionHistoryDialog.tsx`)
- New component — a `Dialog` that fetches all `platform_versions` ordered by `published_at desc`
- Shows each version as a card with badge, title, notes, and date
- Used by internal users who don't have a What's New page
- Triggered by clicking the version label in the sidebar

### 3. What's New Page — Anchor for Deep Link (`src/pages/WhatsNew.tsx`)
- Add an `id="release-notes"` to the release notes section so clicking the sidebar version can scroll to it
- No other changes needed — release notes section already exists

## Files

| Action | File |
|--------|------|
| Create | `src/components/VersionHistoryDialog.tsx` — dialog showing all version history for team |
| Edit | `src/components/AppSidebar.tsx` — add version badge in footer, clickable with role-based behavior |
| Edit | `src/pages/WhatsNew.tsx` — add `id="release-notes"` anchor to the release notes heading |

No database changes.

