

# Client Switcher — Plan

## Approach
Create a shared React context (`ClientFilterContext`) that holds the selected client ID. Add a client dropdown in the AppLayout header (visible only to SS roles). Each page that displays client-scoped data will consume this context and filter accordingly.

## New: `src/contexts/ClientFilterContext.tsx`
Simple context with `selectedClientId` (string | null) and setter. Defaults to `null` meaning "All Clients". Provider wraps the app inside `AuthProvider`.

## Change: `src/components/AppLayout.tsx`
Add a client selector dropdown in the header bar (between the title and notification bell), visible only when `isSSRole` is true. Fetches clients list and renders a Select with "All Clients" + each active client. Uses `ClientFilterContext`.

## Changes to consuming pages
Each page reads `selectedClientId` from context and applies `.eq("client_id", selectedClientId)` to its queries when a client is selected:

| Page | How it filters |
|------|---------------|
| `src/pages/team/Tasks.tsx` | Add `client_id` filter to the tasks query |
| `src/pages/Requests.tsx` | Add `client_id` filter to the requests query |
| `src/pages/team/Projects.tsx` | Add `client_id` filter to the projects query |
| `src/pages/admin/AdminMedia.tsx` | Sync `clientFilter` state with context value |
| `src/pages/Dashboard.tsx` | Add `client_id` filter to tasks/requests/posts queries in WorkQueueDashboard |

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/ClientFilterContext.tsx` | **New** — context + provider |
| `src/App.tsx` | Wrap with `ClientFilterProvider` |
| `src/components/AppLayout.tsx` | Add client dropdown in header for SS roles |
| `src/pages/team/Tasks.tsx` | Filter by selected client |
| `src/pages/Requests.tsx` | Filter by selected client |
| `src/pages/team/Projects.tsx` | Filter by selected client |
| `src/pages/admin/AdminMedia.tsx` | Sync existing clientFilter with context |
| `src/pages/Dashboard.tsx` | Filter work queue by selected client |

No database changes needed.

