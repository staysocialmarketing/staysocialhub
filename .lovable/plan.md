

# Dashboard Cleanup + FAB Offset — Plan

## Analysis
The `WorkQueueDashboard` component currently renders:
1. Header + filter tabs (My Work / Team Work / All Work)
2. Four stats cards (My Tasks, My Requests, Approvals Waiting, Overdue)
3. Four detailed list sections: My Tasks, My Requests, Approvals Waiting, Overdue Work

The user sees the detailed Approvals Waiting and Overdue sections as redundant "old stacked" layouts since they're already represented in the stats cards. The fix is to keep only the **My Tasks** and **My Requests** list sections as "task previews" below the cards, and remove the Approvals Waiting and Overdue Work list sections (users can click the stat cards to navigate to those pages).

## Changes

### `src/pages/Dashboard.tsx`
- Remove the "Approvals Waiting" `DashboardSection` (lines 312-333) — the stat card already links to `/approvals`
- Remove the "Overdue Work" `DashboardSection` (lines 335-355) — the stat card already shows the count
- Remove unused imports (`CheckSquare` from DashboardSection usage if no longer needed)

### `src/components/GlobalCaptureButton.tsx`
- Change the FAB positioning from `bottom-6` to `bottom-20` on mobile (using responsive class `bottom-6 sm:bottom-6` → `bottom-20 sm:bottom-6`) so it sits above task controls on small screens

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Remove Approvals Waiting and Overdue Work list sections |
| `src/components/GlobalCaptureButton.tsx` | Offset FAB higher on mobile (`bottom-20 sm:bottom-6`) |

No database changes needed.

