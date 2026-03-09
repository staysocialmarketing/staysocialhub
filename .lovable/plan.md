

# Fix Logo Distortion on Mobile / Collapsed Sidebar

## Problem
When the sidebar is in collapsed (icon) mode, the sidebar width shrinks to `3rem` (48px). With `p-4` padding (16px each side), only 16px remains for content. The logo with `h-8 w-auto` tries to render at natural aspect ratio but gets squeezed, causing distortion.

On mobile, the `state` variable can still be "collapsed" (it tracks desktop open/close state independently of the Sheet), which may also affect rendering inside the mobile Sheet.

## Fix
**File: `src/components/AppSidebar.tsx`** (line ~153-154)

Two changes:
1. When `collapsed`, show a smaller square-cropped version of the logo (`h-8 w-8 object-cover`) that fits the icon strip
2. When expanded (including inside the mobile Sheet), show the full logo with `h-8 w-auto`

```tsx
<div className="flex items-center gap-2">
  <img
    src={orangeLogo}
    alt="Stay Social"
    className={cn(
      "rounded-lg shrink-0",
      collapsed ? "h-8 w-8 object-cover" : "h-8 w-auto object-contain"
    )}
  />
  {!collapsed && (
    <div className="flex flex-col min-w-0">
      <span className="...">Stay Social</span>
      <span className="...">Client HUB</span>
    </div>
  )}
</div>
```

This ensures the logo looks correct in all three states: expanded desktop, collapsed desktop icon strip, and mobile Sheet drawer.

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Conditionally apply `w-8 object-cover` when collapsed, `w-auto object-contain` when expanded |

