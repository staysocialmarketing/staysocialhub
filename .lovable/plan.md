

# Store Google OAuth Credentials + Build Meeting Notes Feature

## Step 1: Store Secrets (first action when switching to build mode)

Two secrets to add via the `add_secret` tool:
- `GOOGLE_CLIENT_ID` → `508191597658-jkqgk7e36u69d3t3i36mn70el1apff60.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` → `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`

These are stored encrypted in the backend and only accessible from edge functions. They never appear in frontend code.

## Step 2: Build the Full Meeting Notes Feature (as previously approved)

Once secrets are stored, proceed with the approved Phase B plan:

1. **Database migration**: Create `google_integrations` and `meeting_notes` tables with ss_admin-only RLS
2. **Edge functions**:
   - `google-oauth-callback` — exchanges auth code for tokens, stores in `google_integrations`
   - `sync-meeting-notes` — polls Google Drive for Gemini/Meet notes, fetches via Docs API
   - `extract-meeting-data` — AI extraction pipeline routing to tasks/requests/strategy/captures
3. **Admin UI**: `/admin/meeting-notes` page (restricted to corey@staysocial.ca)
4. **Client Brain integration**: Meeting Notes tab on Client Brain page
5. **Navigation**: Sidebar link + route, admin-only visibility

## Security Note

After implementation, consider regenerating your Google Client Secret in Google Cloud Console since it appeared in chat. You would then update the stored secret with the new value.

