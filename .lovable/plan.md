

# Fix Distorted Logo in Sidebar

## Problem
The Stay Social logo in the sidebar (`src/components/AppSidebar.tsx` line 154) is forced into a square shape with `h-8 w-8`, distorting the rectangular logo image.

## Fix
**File: `src/components/AppSidebar.tsx`** (line 154)
- Change `h-8 w-8` to `h-8 w-auto` so the image maintains its natural aspect ratio while keeping a consistent height
- Keep `object-contain` and `shrink-0` as-is

Single line change:
```tsx
// Before
<img src={orangeLogo} alt="Stay Social" className="h-8 w-8 rounded-lg object-contain shrink-0" />

// After
<img src={orangeLogo} alt="Stay Social" className="h-8 w-auto rounded-lg object-contain shrink-0" />
```

