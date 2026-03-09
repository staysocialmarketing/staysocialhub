

# Hub Dashboard UX Improvements + Clickability Fix

## Summary
Fix the missing `onClick` on the Overdue stat card and ensure all dashboard cards route correctly. The current primary color (`hsl(19, 100%, 49%)`) already equals `#fb5000`, so no CSS changes needed for brand alignment. The StatCard component already has proper hover effects.

## Issues Found

### 1. Overdue Card Missing onClick
In `WorkQueueDashboard` (line 206-211), the Overdue stat card has no `onClick`:
```tsx
<StatCard
  label="Overdue"
  value={overdueCount}
  icon={<AlertTriangle className="h-4 w-4" />}
  accent="destructive"
  // Missing onClick!
/>
```

### 2. Current State of Other Cards
- **My Tasks** → `/team/tasks` ✓
- **My Requests** → `/requests` ✓  
- **Approvals** → `/approvals` ✓
- **Overdue** → **MISSING** ❌

## Changes

### `src/pages/Dashboard.tsx`
1. Add `onClick` to the Overdue stat card to navigate to `/team/tasks?filter=overdue`
2. Verify all other dashboard cards are properly clickable (they are)

### `src/components/ui/stat-card.tsx`
The component already has:
- `cursor-pointer` ✓
- `hover:shadow-md` ✓
- `transition-all` ✓
- `group-hover:text-primary` on icon ✓

No changes needed - styling is already good.

### `src/index.css` 
Current primary: `--primary: 19 100% 49%` = `hsl(19, 100%, 49%)` ≈ `#fb5000` ✓

No changes needed - brand color is already correct.

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `onClick` to Overdue card |

## Result
- All 4 stat cards in WorkQueueDashboard will be clickable
- Overdue routes to tasks page with overdue filter
- Hover effects already work correctly
- Brand colors already aligned

