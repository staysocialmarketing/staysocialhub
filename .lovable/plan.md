

# Super Admin "View As" Toggle

## Concept
Add a client-side "View As" feature to `AuthContext` that lets the super admin override their effective role and profile to see the app exactly as any other user would — without changing auth or RLS (data access stays at ss_admin level, but the UI renders the target user's experience).

## How It Works

### AuthContext Changes
- Add `viewAsUserId` state (null = normal mode)
- Add `setViewAs(userId: string | null)` function
- When `viewAsUserId` is set, fetch that user's profile and roles, and expose them as `effectiveProfile`, `effectiveRoles`, `effectiveIsSSAdmin`, etc.
- All existing consumers already use `isSSAdmin`, `isSSTeam`, `profile`, etc. — these will return the **effective** values when viewing as someone else
- Add `actualIsSSAdmin` boolean so the "View As" selector itself always renders for the real admin
- Add `isViewingAs` boolean for UI indicators

### Sidebar — "View As" Selector
- In `AppSidebar.tsx`, when `actualIsSSAdmin` is true, render a dropdown at the top (below logo) showing all users
- Options: "My View" (default), then all users grouped by role (Team, then Clients)
- Selecting a user calls `setViewAs(userId)` — the entire app re-renders with that user's perspective
- Show a colored banner/badge when viewing as someone else

### AppLayout Banner
- When `isViewingAs` is true, show a small top banner: "Viewing as: [Name] ([Role]) — Exit" so it's always clear

### What Changes Per View
- Sidebar navigation switches to match the target role
- Dashboard renders the correct variant
- Approvals shows the correct columns
- Requests filters by that user's client
- Data is still fetched with the real ss_admin token (so RLS returns all data), but the UI filters/renders as if they were that user

### Important: Data Filtering
When viewing as a client user, queries that filter by `profile.client_id` will use the **viewed user's** `client_id`, so the dashboard/requests/approvals naturally scope down to that client's data.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `viewAsUserId`, `setViewAs`, effective vs actual role booleans |
| `src/components/AppSidebar.tsx` | Add "View As" dropdown for actual ss_admin |
| `src/components/AppLayout.tsx` | Add "Viewing as" banner when active |

No database changes needed.

