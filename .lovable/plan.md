

# Make Requests Clickable and Editable

## What's Needed
Currently, request cards on the Requests page are static — no way to click into them to see full details or edit fields. We need:

1. **A Request Detail dialog** — clicking any request card opens a dialog showing all fields with inline editing
2. **Editable fields** — SS roles can edit all fields; clients can edit topic, notes, priority, and preferred_publish_window on their own requests
3. **Comments section** — the `comments` table already supports `request_id`, so we can show/add comments on requests too

## Implementation

### `src/pages/Requests.tsx`
- Make each request `Card` clickable (`cursor-pointer`, `onClick` sets `selectedRequest`)
- Add a **Request Detail Dialog** that opens when a request is selected, showing:
  - All fields (type, topic, notes, priority, status, preferred_publish_window, attachments, client name, created by, date)
  - Editable inputs for topic, notes, priority, preferred_publish_window (SS roles: all fields + status; clients: their own requests' editable fields)
  - Save button that calls `supabase.from("requests").update(...)` 
  - Comments section (fetch/add comments where `request_id = selectedRequest.id`)
  - Attachment download link if `attachments_url` exists
- Add a route `/requests/:requestId` as an alternative (optional — dialog approach is simpler and keeps context)

### Approach: Dialog-based detail view
Rather than a separate page, open a full-detail dialog on card click. This keeps the list visible and is consistent with other patterns in the app. The dialog will have:
- **Header**: Type icon + topic + client name
- **Body**: Editable form fields (conditionally editable based on role)
- **Sidebar area**: Status selector, priority, dates
- **Comments**: List + add form (reusing the comments table with `request_id`)

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Requests.tsx` | Add click handler on cards, add RequestDetailDialog with editable fields and comments |

No database changes needed — `comments.request_id` already exists, and `requests` table has update RLS for `can_access_client(client_id)`.

