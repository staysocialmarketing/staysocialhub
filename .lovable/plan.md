

# Media Library Tagging + Search

## Summary
Add a `tags` jsonb column to the `posts` table for flexible tagging (campaign, custom labels). Leverage existing `platform` and `content_type` columns for those filters. Add a search bar and tag-based filtering to both the client My Media and admin Media Library views. Tags are editable by admin/team in the edit dialog and optionally set during upload.

## Database Changes

### Migration
```sql
ALTER TABLE public.posts ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'::jsonb;
```
Tags stored as array of objects: `[{"category": "campaign", "value": "Spring Renewal"}, {"category": "content_type", "value": "Reel"}]`

No new tables needed — keeps it simple and avoids join overhead for filtering.

## Frontend Changes

### `src/pages/admin/AdminMedia.tsx`
- Add search bar (Input) above the grid — filters by title, client name, platform, and tag values (client-side)
- Replace the simple type/client dropdowns with a richer filter row: Client, Platform, Campaign, Content Type (all derived from posts data + tags)
- In the Edit Media dialog, add a "Tags" section: show existing tags as removable badges, add new tags via category select + value input
- Media cards show up to 3 tag badges below the title

### `src/pages/ContentLibrary.tsx` (client My Media)
- Add search bar above tabs — filters by title and tag values
- Show tag badges on media cards (read-only, max 3)
- No tag editing for clients

### Upload Dialog (both pages)
- Add optional tag inputs during upload: Campaign and Content Type tag fields
- Use simple text inputs with autocomplete from existing tag values

## Approach Details

**Search**: Client-side filtering on the already-fetched posts array. Matches title, client name, platform, and any tag value against the search query (case-insensitive).

**Tag Autocomplete**: Extract unique tag values from all posts to suggest existing tags when adding new ones.

**Permissions**: Admin/Team can add/remove tags via edit dialog. Clients see tags read-only.

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `posts` | Add `tags` jsonb column |
| Edit | `src/pages/admin/AdminMedia.tsx` | Search bar, tag filters, tag editing in dialog, tag badges on cards |
| Edit | `src/pages/ContentLibrary.tsx` | Search bar, tag badges on cards (read-only) |

