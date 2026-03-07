

# Global Capture Button — Implementation Plan

## Overview
Add a floating "+" button (FAB) to the bottom-right corner for Admin and SS Team users. Clicking it opens a modal with 5 capture options, each opening its own inline form within the same modal.

## New File: `src/components/GlobalCaptureButton.tsx`
A single new component containing:

### FAB Button
- Fixed `bottom-6 right-6`, `z-50`, rounded-full primary button with `Plus` icon
- Only rendered when `isSSRole` is true (from `useAuth`)
- Rotates icon 45° when modal is open

### Modal (Dialog)
When opened, shows 5 option cards in a grid:
1. **Create Task** — opens inline form with: Title, Client (ClientSelectWithCreate), Project (Select), Priority, Assign To, Due Date (DatePickerField), Description
2. **Create Request** — reuses `MakeRequestDialog` by opening it directly (set state, close capture modal)
3. **Capture Idea** — inline form with: Title, Description, Type (idea/brainstorm/meeting_note), Client (optional), optional image upload to `creative-assets` bucket
4. **Upload Screenshot / Image** — file input accepting images, client selector, optional link to existing task/idea via select. Uploads to `creative-assets` bucket
5. **Record Voice Note** — uses `MediaRecorder` API to record from microphone, stores audio as `.webm` in `creative-assets` bucket, optional attach-to selector (Task/Idea/Request)

### Data Flow
- **Create Task**: `INSERT INTO tasks` (same logic as Tasks.tsx create)
- **Create Request**: Opens existing `MakeRequestDialog` component
- **Capture Idea**: `INSERT INTO think_tank_items`
- **Upload Image**: Upload to `creative-assets` storage bucket, no separate DB record (media library reads from storage)
- **Voice Note**: Upload `.webm` to `creative-assets` storage, optionally link via task description update

## Integration Point: `src/components/AppLayout.tsx`
Add `<GlobalCaptureButton />` inside the layout, after `<main>`, so it floats over all pages.

## Files Changed

| File | Change |
|------|--------|
| `src/components/GlobalCaptureButton.tsx` | **New** — FAB + modal with 5 capture sub-forms |
| `src/components/AppLayout.tsx` | Import and render `<GlobalCaptureButton />` |

## No Database Changes
All tables (tasks, think_tank_items, requests) and storage buckets (creative-assets) already exist. Voice notes are stored as files in the existing `creative-assets` bucket. No migration needed.

## Technical Notes
- Voice recording uses browser `navigator.mediaDevices.getUserMedia` + `MediaRecorder` — works on mobile and desktop
- Image compression uses existing `compressImage` from `@/lib/imageUtils`
- The "Create Request" option simply opens the existing `MakeRequestDialog` to avoid duplicating logic
- All forms use `toast` from sonner for success/error feedback

