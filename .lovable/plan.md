

# Fix: Make Task Title Visibly Editable in Edit Mode

## Problem
When users click Edit in the TaskDetailDialog, the title input is styled with `border-none p-0 h-auto focus-visible:ring-0 shadow-none`, making it visually identical to the read-only text. Users cannot tell the title is editable.

## Fix

**File: `src/components/TaskDetailDialog.tsx` (line 283)**

Replace the invisible-border input with a properly styled one that has a visible border and background to signal editability:

```tsx
<Input 
  value={title} 
  onChange={(e) => setTitle(e.target.value)} 
  className="text-lg font-semibold" 
/>
```

This removes the `border-none`, `p-0`, `shadow-none`, and `focus-visible:ring-0` overrides so the standard Input styling applies, making it clearly editable with a visible border.

