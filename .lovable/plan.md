
# Hub Mobile Optimization Sweep

## Summary
Comprehensive mobile optimization across the Stay Social HUB focusing on layout adjustments, touch interactions, and responsive behavior for phones and tablets.

## Current State Analysis
- **Dashboard**: Already uses `grid-cols-2 lg:grid-cols-4` for stat cards ✓
- **Workflow Board**: Uses `ScrollArea` with horizontal scroll, but columns have fixed widths that make mobile difficult
- **Sidebar**: Already uses Sheet/drawer pattern on mobile via the `useIsMobile` hook ✓
- **Request Detail**: Uses `max-w-2xl` dialog but needs vertical stacking on mobile
- **Approvals**: Action buttons are side-by-side, need stacking on mobile
- **Content Library**: Grid is `grid-cols-1 sm:grid-cols-2` — partially mobile ready
- **Global Search**: Trigger button is minimal; CommandDialog needs no changes

## Changes Required

### 1. Dashboard — Already Optimized ✓
Current: `grid-cols-2 lg:grid-cols-4` on line 187 of Dashboard.tsx
No changes needed.

### 2. Workflow Board Mobile Improvements
**File: `src/pages/Workflow.tsx`**
- Add visible left/right scroll indicators (chevron arrows) when columns overflow
- Reduce column width on mobile (`w-[260px] sm:w-[290px]`)
- Add touch-friendly tap targets (cards already clickable)
- Ensure proper padding for mobile

### 3. Request Detail Dialog Mobile Optimization
**File: `src/components/RequestDetailDialog.tsx`**
- Stack form fields vertically on mobile (change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`)
- Increase button heights for touch (`min-h-[44px]`)
- Strategy/AI panels already use Collapsible, add `defaultOpen={false}` on mobile

### 4. Approvals Screen Mobile Buttons
**File: `src/components/ApprovalActions.tsx`**
- Stack Approve/Changes buttons vertically on mobile (`flex-col sm:flex-row`)
- Add `min-h-[44px]` for touch-friendly targets

### 5. Content Library — Verify 2-Column Mobile
**File: `src/pages/ContentLibrary.tsx`**
Already uses `grid-cols-1 sm:grid-cols-2` — change to `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` for 2-col on mobile

### 6. Global Search Mobile Behavior
**File: `src/components/GlobalSearch.tsx`**
- Add mobile-specific full-width styling to trigger
- CommandDialog is already modal/overlay — works well on mobile

### 7. Workflow Mobile Navigation Arrows
Add left/right arrow buttons that appear on scroll overflow for easier column navigation on mobile

### 8. General Touch Improvements
- Remove `opacity-0 group-hover:opacity-100` patterns on mobile (make always visible)
- Ensure all interactive elements have minimum 44px touch targets

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/Workflow.tsx` | Add scroll arrows, reduce column width on mobile, touch improvements |
| `src/components/RequestDetailDialog.tsx` | Stack fields vertically on mobile, increase button heights |
| `src/components/ApprovalActions.tsx` | Stack buttons vertically on mobile, increase touch targets |
| `src/pages/ContentLibrary.tsx` | Change to 2-column grid on mobile |
| `src/pages/Dashboard.tsx` | Make hover-only actions always visible on mobile |
| `src/components/GlobalSearch.tsx` | Minor mobile styling for trigger button |

## Implementation Notes
- Use existing `useIsMobile` hook from `@/hooks/use-mobile` for conditional logic
- Keep all animations lightweight — existing Tailwind transitions are fine
- Preserve desktop UX while optimizing mobile
