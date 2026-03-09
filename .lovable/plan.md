

# Auto-Update Header Version on New Release

## Problem
The version label in the header only loads once on mount. When you publish a new version from Admin Versions, the header still shows the old version until a full page refresh.

## Solution
Subscribe to Supabase Realtime on the `platform_versions` table so the header version updates instantly when a new row is inserted.

## Changes

**1. Database: Enable realtime on `platform_versions`**
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_versions;`

**2. File: `src/components/AppLayout.tsx`**
- Extract the version fetch logic into a reusable function
- Add a Realtime subscription to `platform_versions` that re-fetches the latest version on any `INSERT` event
- Clean up the subscription on unmount

