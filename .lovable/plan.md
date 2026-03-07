

# Client "What's New" — Bug Fix

## Already Implemented
Everything described in the request already exists:
- WhatsNew page at `/whats-new` with service cards (name, description, price, icon, CTA button)
- "Request This Service" button creates addon_requests
- Admin controls visibility per client via `whats_new_visible_addons` in AdminClients
- Dashboard CTA section with recommended/newest items
- Sidebar navigation link

## Bug to Fix
`WhatsNew.tsx` line 39 fetches **all** active marketplace items. It should filter to only show items whose IDs are in the client's `whats_new_visible_addons` array. When that array is empty, show all items (current default behavior as fallback).

### Change in `src/pages/WhatsNew.tsx`
After fetching client data (which already retrieves `whats_new_visible_addons`), store the visible addons list. Then filter the marketplace items to only include IDs present in that list. If the list is empty, show all items as a fallback.

| File | Change |
|------|--------|
| `src/pages/WhatsNew.tsx` | Filter marketplace items by `whats_new_visible_addons` from client data |

No database changes needed.

