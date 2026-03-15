

# Calendar & Access Design Review

## Issues Found

### 1. Calendar not accessible to clients
The `/calendar` route is wrapped in `<AdminRoute>`, blocking clients entirely. Clients should see it — filtered to their own content only. RLS on `posts` already enforces `can_access_client(client_id)`, so data isolation is safe at the database level.

### 2. Client sidebar has no Calendar link
The `clientItems` array in `AppSidebar.tsx` doesn't include a Calendar entry.

### 3. Calendar filter: clients see "Client" dropdown (irrelevant for them)
The filter bar shows a Client dropdown even for client users who can only see their own data. Should hide Client/Assignee filters for client roles.

### 4. Calendar mobile spacing
Calendar cells use `min-h-[80px]` and `gap-1` which is tight on mobile. The 7-column grid doesn't adapt — needs smaller cells on mobile and a better daily detail view.

### 5. Board tab horizontal scroll on mobile
The board tab uses `flex gap-4` with fixed `w-72` columns — fine on desktop but awkward on mobile. Should stack or scroll gracefully.

## Plan

### `src/App.tsx`
- Remove `<AdminRoute>` wrapper from `/calendar` route — make it a standard protected route accessible to all authenticated users (data isolation handled by RLS)

### `src/components/AppSidebar.tsx`
- Add `{ title: "Calendar", url: "/calendar", icon: CalendarDays }` to `clientItems` array (after Approvals)

### `src/pages/MarketingCalendar.tsx`
**Role-aware filters:**
- Import `useAuth` and check `isSSRole`
- If client role: hide Client and Assignee filter dropdowns (they only see their own data via RLS anyway)
- If SS role: show all filters as-is

**Mobile calendar spacing:**
- Calendar cells: reduce `min-h-[80px]` to `min-h-[60px] sm:min-h-[80px]`
- Calendar grid gap: `gap-px sm:gap-1`
- Day number text: slightly larger tap target
- Selected date cards grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

**Board tab mobile:**
- Change fixed `w-72` to `w-64 sm:w-72` and add `min-w-0` for better mobile scroll

**List tab mobile:**
- Hide less important columns (Assignee, Platform) on small screens with `hidden sm:table-cell`

**Client-visible statuses:**
- For client users, filter the `PIPELINE_STATUSES` query to only show client-visible stages: `client_approval`, `scheduled`, `ready_to_schedule`, `published`. Internal stages like `internal_review`, `corey_review`, `ready_for_client_batch` should not appear for clients.
- Similarly filter `BOARD_COLUMNS` to only show client-relevant columns for client users.

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Remove AdminRoute from `/calendar` |
| `src/components/AppSidebar.tsx` | Add Calendar to client nav |
| `src/pages/MarketingCalendar.tsx` | Role-aware filters, mobile spacing, client status filtering |

