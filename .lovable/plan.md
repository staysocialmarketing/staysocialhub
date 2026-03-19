

# Stay Social Brain — Batch 2: Capture

## Overview
Add a "Capture" tab alongside the existing "Brand Twin" tab inside the ClientBrain page. New database table for captured items, a messaging-style input UI, voice recording, file/link quick actions, and a mobile sticky capture bar.

## Database

### New table: `brain_captures`

| Column | Type | Default |
|--------|------|---------|
| `id` | uuid PK | `gen_random_uuid()` |
| `client_id` | uuid (references clients) | — |
| `created_by_user_id` | uuid | — |
| `type` | text | `'note'` |
| `content` | text | `''` |
| `attachment_url` | text | null |
| `attachment_name` | text | null |
| `voice_transcript` | text | null |
| `link_url` | text | null |
| `notes` | text | null |
| `tags` | jsonb | `'[]'` |
| `converted_to_request_id` | uuid | null |
| `created_at` | timestamptz | `now()` |

RLS: `is_ss_role()` for all operations (same as brand_twin).

## UI Changes

### `src/pages/admin/ClientBrain.tsx`
Add a tab switcher at the top: **Brand Twin** | **Capture**. The existing Brand Twin content stays untouched — just wrapped in a conditional render.

### Capture Tab Layout

**1. Input Area (Top)**
- Large, minimal textarea with placeholder "Drop an idea, voice note, or link..."
- Submit on Enter (Shift+Enter for newline) or a send button
- Messaging-app feel — no labels, no form chrome

**2. Quick Action Buttons**
- Row of 4 icon buttons below input: Voice, Link, File, Idea
- Large tap targets, evenly spaced, mobile-friendly
- Voice: uses browser MediaRecorder API → records audio → uploads to `creative-assets` bucket under `captures/{clientId}/` → saves with type `voice`
- Link: opens a small inline input to paste a URL
- File: triggers file picker → uploads → saves with type `file`
- Idea: sets type to `idea` and focuses input

**3. Captured Items List**
- Vertical stack of cards below, newest first
- Each card shows: content preview (truncated), type badge, date, creator name
- Click to expand inline (collapsible) showing full content, attachments, notes
- Card actions: Convert to Request, Add Notes, Tag, Delete

**4. Mobile Sticky Bar**
- Fixed bottom bar on mobile (`sm:hidden`): `[+ Add Idea] [🎤] [📎]`
- Scrolls to top input and focuses, or triggers voice/file directly

### Voice Recording
- Uses native `MediaRecorder` API (no external dependencies)
- Records as webm/opus
- Uploads to `creative-assets` bucket
- For transcription: use Lovable AI (Gemini Flash) via an edge function `transcribe-capture` that takes the audio URL and returns text
- Saved as a capture item with `type: 'voice'` and `voice_transcript` populated

### Convert to Request
- Opens the existing `MakeRequestDialog` pre-filled with capture content
- On success, updates `converted_to_request_id` on the capture record

## New Edge Function: `supabase/functions/transcribe-capture/index.ts`
- Accepts `{ audioUrl }` 
- Fetches the audio file
- Sends to Lovable AI (Gemini Flash) for transcription
- Returns `{ transcript }`

## Files Changed

| File | Change |
|------|--------|
| Migration | Create `brain_captures` table + RLS |
| `src/pages/admin/ClientBrain.tsx` | Add tab switcher, Capture tab with input/cards/mobile bar |
| `supabase/functions/transcribe-capture/index.ts` | New edge function for voice transcription |
| `supabase/config.toml` | NOT edited (auto-managed) |

## Security
- RLS restricted to `is_ss_role()` — clients cannot access
- File uploads use existing `creative-assets` bucket policies
- Edge function validates auth token before processing

