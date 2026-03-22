

# Fix: Google OAuth Redirect From Preview

## Root Cause

The "Connect Google" button sets `window.location.href` to redirect to Google's OAuth page. Inside the Lovable preview iframe, this navigation is silently blocked by the browser's cross-origin iframe restrictions. No request ever reaches Google — that's why there are zero edge function logs and zero network requests to Google.

## Solution

Change `window.location.href` to `window.open()` so it opens in a new tab, bypassing iframe restrictions. This works from both the preview and the published app.

## Code Change

### `src/pages/admin/MeetingNotes.tsx`

Replace line 52:
```typescript
// Before
window.location.href = url;

// After  
window.open(url, "_blank");
```

## Google Cloud Console Requirement (unchanged)

Make sure these are in your **Authorized JavaScript origins**:
- `https://hub.staysocial.ca`

And this is in your **Authorized redirect URIs**:
- `https://aernowjtmvisvayzpccg.supabase.co/functions/v1/google-oauth-callback`

(You confirmed the redirect URI is already set. Just verify the JavaScript origin.)

| File | Change |
|---|---|
| `src/pages/admin/MeetingNotes.tsx` | `window.location.href` → `window.open(url, "_blank")` |

