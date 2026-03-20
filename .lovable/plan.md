

# Fix Google Sign-In Blocked Issue

## Diagnosis

The error message is generic — it catches everything and says "blocked." The actual error from the OAuth flow is being swallowed. Two likely causes:

1. **Popup blocked by browser** — common on preview URLs
2. **Redirect URI mismatch** — the code sends `window.location.origin + "/dashboard"` but the Lovable Cloud OAuth config may not have this preview domain whitelisted

## Fix

**Step 1: Surface the actual error** — Update `handleGoogleSignIn` to log `result.error` so we can see what ElevenLabs/OAuth is actually returning. Show the real error message in the toast instead of the generic one.

**Step 2: Fix redirect_uri** — Change from `window.location.origin + "/dashboard"` to just `window.location.origin`. The OAuth redirect should go to the origin, and the `AuthRoute` component already handles redirecting authenticated users to `/dashboard`.

**File:** `src/pages/Auth.tsx`

These are small, quick changes that should resolve or at least diagnose the issue.

