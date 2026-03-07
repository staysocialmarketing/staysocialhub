

# Fix Header/Logo Scrolling Off Screen

## Problem
The outer layout container uses `min-h-screen` which allows the entire page to grow taller than the viewport. This means the browser's native scroll takes over instead of the `overflow-auto` on the `<main>` element, causing the header (with the logo/title) to scroll out of view.

## Fix
In `src/components/AppLayout.tsx`, change the outer container from `min-h-screen` to `h-screen overflow-hidden`. This constrains the layout to the viewport height, ensuring only the `<main>` area scrolls while the header stays pinned at the top.

### `src/components/AppLayout.tsx`
- Line 14: Change `min-h-screen flex w-full` → `h-screen flex w-full overflow-hidden`

This is a single-line fix that affects all pages consistently on both mobile and desktop.

