

# Hub Security + Data Integrity Hardening

## Summary
Security audit found several concrete issues to fix. The overall RLS posture is solid — most tables have proper policies scoped to `client_id` via `can_access_client()` and `is_ss_role()`. The key issues are: internal notes leaking to clients, a public storage bucket exposing media, missing storage RLS policies, the `generate-strategy` edge function having no JWT verification, and missing database indexes for performance.

## Issues Found

### 1. Internal Notes Exposed to Clients (SECURITY FIX)
**File: `src/components/WorkflowCardDialog.tsx` (line 487)**
`post.internal_notes` is displayed to ALL users without checking `isSSRole`. Clients can see internal team notes.

**Fix**: Wrap the internal_notes display block with `{isSSRole && ...}`.

### 2. `creative-assets` Bucket Is Public (SECURITY CONCERN)
The `creative-assets` bucket is set to `public: true`, meaning any URL is guessable and accessible without auth. This exposes all client creative assets to anyone with the URL.

**Fix**: Add storage RLS policies to restrict access. Since URLs are already shared via `getPublicUrl()` throughout the codebase (7+ files), making the bucket private would break all existing media rendering. Instead, add **storage.objects RLS policies** that restrict uploads to authenticated users while keeping reads public (acceptable tradeoff — URLs contain UUIDs and aren't enumerable).

### 3. `request-attachments` Bucket Missing RLS Policies
The bucket is private (good), but needs explicit RLS policies on `storage.objects` for upload/download scoping.

**Fix**: Add storage RLS policies:
- INSERT: authenticated users can upload to their client's folder
- SELECT: users can read files via `can_access_client` or SS role

### 4. `generate-strategy` Edge Function Has `verify_jwt = false`
This means anyone can call the function without authentication. The function does its own auth check via `getClaims`, but the config should enforce JWT verification at the gateway level too.

**Fix**: Set `verify_jwt = true` in `supabase/config.toml`. The function already passes the auth header to the Supabase client.

### 5. Missing Database Indexes for Performance
No custom indexes exist on commonly queried columns.

**Fix**: Add indexes via migration:
- `requests(client_id)`, `requests(status)`, `requests(created_at)`
- `posts(client_id)`, `posts(status_column)`, `posts(created_at)`
- `tasks(client_id)`, `tasks(status)`, `tasks(assigned_to_user_id)`
- `comments(post_id)`, `comments(request_id)`
- `notifications(user_id, read)`

### 6. No Role Check in `generate-strategy` Function
The edge function authenticates the user but doesn't verify they have an SS role. A client user could call it.

**Fix**: After auth, query `user_roles` to verify the caller has an SS role before proceeding.

## No Issues Found (Already Secure)
- **RLS on all tables**: All 20+ tables have RLS enabled with proper policies ✓
- **Client data isolation**: All client-facing tables use `can_access_client(client_id)` ✓
- **Role separation**: SS-only tables (tasks, projects, think_tank, universal_inbox) restrict to `is_ss_role()` ✓
- **Auth context**: All queries go through the Supabase client with session tokens ✓
- **File size limits**: 10MB enforced client-side ✓
- **Image compression**: Applied before upload ✓
- **Internal notes in PostDetail**: Already gated by `isSSRole` ✓
- **Signed URLs for private attachments**: `request-attachments` uses `createSignedUrl` with 300s expiry ✓

## Changes

| Action | File/Target | Change |
|--------|-------------|--------|
| Edit | `src/components/WorkflowCardDialog.tsx` | Gate `internal_notes` display with `isSSRole` |
| Edit | `supabase/config.toml` | Set `verify_jwt = true` for `generate-strategy` |
| Edit | `supabase/functions/generate-strategy/index.ts` | Add SS role verification after auth |
| Migration | Database | Add performance indexes on key columns |
| Migration | Storage | Add RLS policies on `storage.objects` for upload restrictions |

