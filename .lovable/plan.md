

# Fix Header Layout — Search Bar Squishing Title

## Problem
The search bar in the header uses `w-full` on mobile, which causes it to expand and squeeze the "Stay Social HUB" title. The title div has `flex-1` which competes with the search bar for space.

## Fix
**File: `src/components/GlobalSearch.tsx`** (line 68)
- Remove `w-full` from the search button so it doesn't stretch on mobile
- Add `hidden sm:flex` to hide it on mobile entirely (search is still accessible via ⌘K), OR use `shrink-0` to prevent it from pushing the title

**File: `src/components/AppLayout.tsx`** (line 56)
- Add `shrink-0` and remove `flex-1` from the title wrapper, or add `min-w-0` to allow proper truncation

Recommended approach — keep search visible but compact:

| File | Line | Change |
|------|------|--------|
| `src/components/GlobalSearch.tsx` | 68 | Change `w-full sm:w-auto` to `w-auto shrink-0` so the button never stretches |
| `src/components/AppLayout.tsx` | 56 | Change title div from `flex-1` to `flex-1 min-w-0 shrink-0` and add `whitespace-nowrap` to the h1 |

