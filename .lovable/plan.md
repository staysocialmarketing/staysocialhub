

# Fix: Update Hardcoded Fallback URL + Origin Encoding

## Problem
1. The OAuth callback fallback URL is `staysocialhub.lovable.app` — should be `hub.staysocial.ca`
2. Google strips custom query params from the callback URL, so the `origin` param never arrives — need to encode it in the `state` parameter instead

## Google Cloud Console Action (you)
In **Authorized JavaScript origins**, make sure `https://hub.staysocial.ca` is listed (add the preview domain too if you want to test from there).

## Code Changes

### 1. `src/pages/admin/MeetingNotes.tsx`
Encode both the access token and origin into the `state` param as JSON, so Google preserves it through the callback:
```
state = JSON.stringify({ token: session.access_token, origin: window.location.origin })
```
Remove the separate `&origin=` query param.

### 2. `supabase/functions/google-oauth-callback/index.ts`
- Parse `state` as JSON to extract `token` and `origin`
- Update fallback origin from `staysocialhub.lovable.app` → `hub.staysocial.ca`

| File | Change |
|---|---|
| `src/pages/admin/MeetingNotes.tsx` | Encode origin in state JSON |
| `supabase/functions/google-oauth-callback/index.ts` | Parse state JSON, update fallback URL |

