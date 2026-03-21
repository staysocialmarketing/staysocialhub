

# Phase B: Google OAuth Meeting Notes Sync (Admin Only)

## Important Prerequisite

This requires Google Drive + Docs API access, which is separate from the sign-in OAuth. The managed Lovable Cloud Google sign-in only covers authentication scopes — it cannot access Drive or Docs. We need a dedicated Google OAuth flow with `drive.readonly` and `documents.readonly` scopes, which means:

- You'll need a Google Cloud project with **Google Drive API** and **Google Docs API** enabled
- A separate OAuth Client ID + Secret configured for this integration
- These credentials get stored as secrets in the project

I'll walk you through that setup when we build it.

## What Gets Built

### 1. Database: Two New Tables

**`google_integrations`** — stores OAuth tokens per user (admin only)
- `user_id`, `access_token` (text), `refresh_token` (text), `token_expires_at`, `scopes`, `created_at`
- RLS: only the owning user can read/manage their own row

**`meeting_notes`** — synced meeting note documents
- `id`, `user_id`, `client_id` (nullable, resolved after extraction), `google_doc_id` (unique), `title`, `raw_content`, `meeting_date`, `extraction_status` (pending/processing/done/failed), `extracted_data` (jsonb), `created_at`
- RLS: ss_admin only

### 2. Edge Function: `google-oauth-callback`

Handles the OAuth callback after the user authorizes Drive access:
- Exchanges auth code for access + refresh tokens
- Stores in `google_integrations` table
- Redirects back to the Meeting Notes page
- Restricted to `corey@staysocial.ca` via email check

### 3. Edge Function: `sync-meeting-notes`

Called from the UI "Sync Now" button:
- Reads stored Google tokens from `google_integrations`
- Refreshes token if expired using refresh token
- Queries Google Drive API for documents created by "Google Meet" (Gemini notes pattern)
- Fetches full document content via Google Docs API
- Upserts into `meeting_notes` table (deduped by `google_doc_id`)
- Returns count of new notes found

### 4. Edge Function: `extract-meeting-data`

AI extraction pipeline (uses Lovable AI / Gemini Flash):
- Takes a meeting note's raw content
- Fetches all clients from DB for name matching
- Uses tool-calling to extract: client identification, action items (tasks/requests), strategy updates, content ideas
- Routes extracted data: inserts tasks, requests, updates client_strategy, creates brain_captures
- Updates `meeting_notes.extraction_status` and `extracted_data`

### 5. Admin UI: `/admin/meeting-notes`

New page with:
- "Connect Google" button (initiates OAuth flow with Drive scopes) — shows "Connected" badge once linked
- "Sync Now" button to pull latest meeting notes
- List of synced notes with title, date, extraction status
- Per-note detail: raw content preview, extracted data review (clients, action items, strategy updates), "Extract" button
- Restricted to `corey@staysocial.ca`

### 6. Client Brain Integration

Add "Meeting Notes" tab to `ClientBrain.tsx` showing notes linked to that specific client after extraction.

### 7. Navigation

- Sidebar: "Meeting Notes" link under Admin, visible only when `profile?.email === 'corey@staysocial.ca'`
- Route: `/admin/meeting-notes` wrapped in `SSAdminRoute`

## Files Summary

| File | Change |
|---|---|
| Migration | `google_integrations` + `meeting_notes` tables with RLS |
| `supabase/functions/google-oauth-callback/index.ts` | New — OAuth code exchange + token storage |
| `supabase/functions/sync-meeting-notes/index.ts` | New — Drive API sync |
| `supabase/functions/extract-meeting-data/index.ts` | New — AI extraction + routing |
| `src/pages/admin/MeetingNotes.tsx` | New — full admin page |
| `src/pages/admin/ClientBrain.tsx` | Add Meeting Notes tab |
| `src/components/AppSidebar.tsx` | Add link (admin-only) |
| `src/App.tsx` | Add route |
| `supabase/config.toml` | Register 3 new edge functions |

## Secrets Needed

Two new secrets (I'll prompt you to add them):
- `GOOGLE_CLIENT_ID` — from your Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from your Google Cloud Console

I'll provide step-by-step instructions for creating the Google Cloud OAuth app with the right scopes and redirect URL when we start building.

