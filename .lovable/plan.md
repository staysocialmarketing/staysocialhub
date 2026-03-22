

# Meeting Notes Improvements

## 1. Redirect after OAuth → Meeting Notes page
**File**: `supabase/functions/google-oauth-callback/index.ts`
- Line 85: already redirects to `/admin/meeting-notes?connected=true` — this works
- The issue is `window.open()` opens a new tab, so the callback lands on the sign-in page because there's no active session in the new tab
- **Fix**: Change the redirect to include a success message parameter, and in the MeetingNotes page, detect `?connected=true` in the URL (already there) and show a toast. The real fix is switching back from `window.open` to `window.location.href` now that you're testing from the published domain (`hub.staysocial.ca`), OR keep `window.open` but have the callback redirect close the popup and signal the opener

**Approach**: Use `window.location.href` for the OAuth redirect (works fine on published domain). Add a `useEffect` in MeetingNotes to detect `?connected=true` query param, show a success toast, and clean the URL.

## 2. Delete meeting notes
**File**: `src/pages/admin/MeetingNotes.tsx`
- Add a Trash icon button on each note card (with stopPropagation)
- Confirmation via AlertDialog before deleting
- Delete mutation: `supabase.from("meeting_notes").delete().eq("id", noteId)`
- RLS already allows ss_admin to do ALL operations

## 3. Richer AI extraction (names, descriptions, client assignment, projects)
**File**: `supabase/functions/extract-meeting-data/index.ts`
- Enhance the AI system prompt to also extract:
  - Proper task names and descriptions (not just titles)
  - Project groupings (create projects if mentioned)
  - Client assignment with confidence
- After extraction, also create projects in `projects` table when new project names are identified
- Ensure tasks get proper descriptions, client_id, and link to created projects

Existing prompt already extracts action_items with title/description/priority and content_ideas. Enhancements:
- Add `projects` array to extraction schema: `{ name, description, client_id }`
- Create projects and link tasks to them
- Fetch existing projects list so AI can match or suggest new ones

## 4. Limit sync to recent meetings only
**File**: `supabase/functions/sync-meeting-notes/index.ts`
- Add a date filter to the Google Drive API query: `modifiedTime > 'YYYY-MM-DDTHH:mm:ss'`
- Default to last 30 days
- Accept optional `since_days` parameter from the request body (default 30)
- **File**: `src/pages/admin/MeetingNotes.tsx` — optionally expose a "Sync last X days" control

**Approach**: Accept `{ since_days: number }` in the request body (default 30). Add `modifiedTime > '...'` to the Drive API query.

## Files to change

| File | Changes |
|---|---|
| `src/pages/admin/MeetingNotes.tsx` | Revert to `window.location.href`, add `?connected=true` detection, add delete button with confirmation, add sync range selector |
| `supabase/functions/google-oauth-callback/index.ts` | No changes needed (already redirects correctly) |
| `supabase/functions/sync-meeting-notes/index.ts` | Add date filter using `since_days` param (default 30) |
| `supabase/functions/extract-meeting-data/index.ts` | Enhanced AI prompt for richer extraction, project creation logic, better task descriptions |

