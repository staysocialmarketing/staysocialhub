

# Fix: Google OAuth 403

## Root Cause

Your Google Cloud project's OAuth consent screen is set to **"Testing"** mode. In this mode, only explicitly listed test users can authorize. Since the callback edge function has zero logs, Google blocked the request before it ever reached your app.

## Fix (Google Cloud Console — no code changes needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **OAuth consent screen**
2. Either:
   - **Add your Google account as a test user**: Under "Test users", click "Add users" and enter `corey@staysocial.ca`
   - **Or publish the app**: Click "Publish App" to move from Testing to Production (since this is internal/single-user, either works)
3. Try "Connect Google" again on the Meeting Notes page

No code changes required.

