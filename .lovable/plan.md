

# Fix Login Issues

## Diagnosis

The "contact your IT administrator" message is a **Google Workspace restriction** — Tristan's Google organization likely blocks third-party OAuth apps. This is outside our control. However, we can ensure the magic link fallback works reliably and improve the error messaging.

## Potential blockers

1. **Email confirmation may be enabled** — if new users need to confirm their email before signing in, magic link OTP won't work for first-time users. We should enable auto-confirm so anyone can sign in immediately.
2. **Poor error messaging** — the Google sign-in failure shows a generic error. We should guide users to try the magic link instead.

## Changes

### 1. Enable auto-confirm for email signups
Use the `configure_auth` tool to enable auto-confirm so magic link sign-ins work immediately without email verification delays.

### 2. Improve Google sign-in error handling (`src/pages/Auth.tsx`)
When Google sign-in fails, show a more helpful message suggesting the magic link alternative:
- Change the error toast to: "Google sign-in was blocked. This may be due to your organization's settings. Try using the magic link below instead."

### 3. Improve magic link error handling (`src/pages/Auth.tsx`)
Show more specific error messages if the magic link fails, so users know what went wrong.

| File | Change |
|------|--------|
| Auth config | Enable auto-confirm for email signups |
| `src/pages/Auth.tsx` | Better error messages for Google + magic link failures |

No database changes needed.

