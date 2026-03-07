

# Client Capture Improvements — Plan

## Changes Overview

Three things to fix:

### 1. MakeRequestDialog: Hide client field for client users
`MakeRequestDialog.tsx` always shows the Client selector. For client users, hide it and auto-set `clientId` from `profile.client_id`.

- Import `useAuth` to check `isSSRole`
- If not SS role, auto-set `clientId = profile.client_id` on open, skip `loadClients()`, hide the Client field
- Adjust submit validation: for clients, `clientId` is auto-populated so the button stays enabled

### 2. Voice notes stored with `voice-notes/` prefix for categorization
Currently voice notes go to `{clientId}/voice-{timestamp}.webm` in `creative-assets`. Change the path to `{clientId}/voice-notes/voice-{timestamp}.webm` so they can be identified and displayed in a dedicated section.

Same for images from the capture button — already going to `{clientId}/` which is fine.

### 3. ContentLibrary.tsx (client "My Media"): Add Voice Notes section
Add a new tab "Voice Notes" alongside Images/Videos/Reels. This tab lists `.webm` files from the `creative-assets` bucket under the client's folder (`{clientId}/voice-notes/`).

- Use `supabase.storage.from("creative-assets").list()` to fetch voice note files for the client's folder
- Display them with audio player, download, and copy link actions
- Since these are in the shared `creative-assets` bucket, Admin/Team media (`AdminMedia.tsx`) already has access to them

### 4. AdminMedia.tsx: Add voice notes awareness
Add a "Voice Notes" media type filter option. Detect `.webm` files as voice notes in the existing `getMediaType` function, and render them with an audio player instead of an image placeholder.

## Files to Change

| File | Change |
|------|--------|
| `src/components/MakeRequestDialog.tsx` | Hide client field for client users, auto-set from profile |
| `src/components/GlobalCaptureButton.tsx` | Update voice note path to include `voice-notes/` subfolder |
| `src/pages/ContentLibrary.tsx` | Add "Voice Notes" tab fetching from storage bucket |
| `src/pages/admin/AdminMedia.tsx` | Add voice note type detection and audio rendering |

No database changes needed.

