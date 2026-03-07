

# Dashboard Propagation + UI Cleanup Pass

## Overview

A visual refinement pass across all major views (Dashboards, Tasks, Projects, Workflow) to create a cleaner, more premium feel with consistent shared patterns. No architectural changes -- purely UI/UX polish.

---

## 1. Shared UI Pattern System

### New file: `src/components/ui/stat-card.tsx`
Reusable stat card component with consistent styling:
- Subtle shadow (`shadow-sm`), no heavy border (`border-0` or `border border-border/50`)
- Generous padding, icon slot, value, label, optional subtitle
- Hover lift effect (`hover:shadow-md transition-all`)
- Used across all three dashboards

### New file: `src/components/ui/section-header.tsx`
Reusable section header with icon, title, optional "View all" action:
- Consistent typography: `text-base font-semibold tracking-tight`
- Subtle bottom border or no border, just spacing
- Used in Dashboard sections, Projects, Tasks

### New file: `src/components/ui/empty-state.tsx`
Reusable empty state with icon, title, optional description and action button:
- Centered layout, generous padding (`py-16`)
- Muted icon, clean typography
- Used across Tasks (no tasks in column), Projects (no projects), Dashboard (no items)

### Badge standardization
Update badge usage across all views to follow consistent rules:
- Priority badges: use `variant="outline"` with the existing priority color map
- Status badges: use `variant="secondary"` with subtle background tints
- Client badges: `variant="outline"` plain
- All badges: consistent `text-[11px]` size (bump from 10px for readability)

---

## 2. Dashboard UI Cleanup

### `src/pages/Dashboard.tsx` -- WorkQueueDashboard
- Replace inline stat `Card` blocks with new `StatCard` component
- Replace `DashboardSection` wrapper: remove card wrapping around lists, use `SectionHeader` + flat list with subtle dividers
- Task/request rows: increase vertical padding (`py-4`), simplify metadata layout -- title left-aligned prominently, metadata grouped right
- Remove heavy `divide-y divide-border`, use `space-y-1` with subtle card-per-item or `border-b border-border/30`
- Increase overall spacing: `space-y-8` instead of `space-y-6`

### `src/pages/Dashboard.tsx` -- ClientDashboard
- Apply same `StatCard` for Awaiting Approval, Open Requests, Sent Campaigns
- Quick Actions: softer borders, slightly larger touch targets
- Marketplace recommendations: cleaner card with less badge clutter
- Consistent `space-y-8` spacing

---

## 3. Tasks UI Cleanup (`src/pages/team/Tasks.tsx`)

- Kanban cards: increase padding to `p-4`, add `space-y-3`
- Title: `text-sm font-semibold` (most prominent element)
- Description: `text-xs text-muted-foreground/70 line-clamp-1` (lighter, shorter)
- Metadata row (assignee + due date): grouped in a single flex row with subtle styling
- Priority badge: consistent outline style from shared system
- Status select: cleaner trigger with `bg-transparent border-border/50`
- Column headers: slightly larger, `text-sm font-semibold`, remove badge count border
- Empty column: use `EmptyState` component, shorter
- Remove `Send` button from card face (keep in detail dialog only) to reduce clutter

---

## 4. Projects UI Cleanup (`src/pages/team/Projects.tsx`)

- Project cards: remove `CardHeader` heavy padding, use `p-5` unified
- Clearer hierarchy: project name `text-base font-semibold`, sub-project names `text-sm font-medium` with left indent marker
- Client badge: move to right side, clean outline style
- Task count: simplified `text-xs text-muted-foreground` without icon
- Task rows within project: reduce density -- `p-3` padding, remove border per-row, use `bg-accent/30 rounded-lg` grouping
- Status filter: cleaner select trigger
- Edit/delete buttons: ghost style, appear on hover only (CSS `group-hover`)

---

## 5. Workflow UI Cleanup (`src/pages/Workflow.tsx`)

- Kanban columns: increase gap between columns (`gap-5`), add `min-w-[280px]`
- Column headers: `text-sm font-semibold`, badge count as plain text not a Badge component
- Cards: increase padding to `p-4`, `space-y-3`
- Remove aspect-video placeholder when no image (just show content type icon inline with title)
- Title: `text-sm font-semibold line-clamp-2`
- Badge row: max 2-3 badges visible, others collapsed
- Assignee row: cleaner with just initials + name, no border-top
- Date info: single line, smaller
- Mobile: add status move buttons (forward/back arrows) below each card for non-drag interaction
- Bottom sections (Scheduled, Published, etc.): cleaner horizontal scroll cards

---

## 6. Global CSS Refinements (`src/index.css`)

- Add utility classes for the premium feel:
  - `.card-elevated` -- `shadow-sm border-border/50 bg-card`
  - Reduce default card border opacity via CSS variable tweak: `--border` slightly lighter

---

## 7. Mobile Refinements

Applied across all views:
- Stat cards: `grid-cols-2` on mobile with reduced padding
- Task/workflow cards: full-width single column on mobile with clear tap targets (`min-h-[44px]` for interactive elements)
- Filter selects: full-width on mobile (`w-full sm:w-44`)
- Section headers: stack title and action vertically on mobile

---

## Files Summary

| Action | File |
|--------|------|
| New | `src/components/ui/stat-card.tsx` |
| New | `src/components/ui/section-header.tsx` |
| New | `src/components/ui/empty-state.tsx` |
| Edit | `src/pages/Dashboard.tsx` (both dashboards) |
| Edit | `src/pages/team/Tasks.tsx` (card cleanup) |
| Edit | `src/pages/team/Projects.tsx` (hierarchy + density) |
| Edit | `src/pages/Workflow.tsx` (card + column cleanup) |
| Edit | `src/index.css` (subtle global refinements) |

No database changes. No new routes. Pure UI/UX pass.

