

# Workflow Layout Cleanup + Universal Drag-and-Drop

## Problem
The bottom grid sections (Scheduled, Published) dominate the page when populated, overshadowing the active workflow columns (New, In Progress, Internal Review). Also, bottom section cards aren't consistently draggable between sections.

## Layout Changes (`src/pages/Workflow.tsx`)

### New structure — two tiers

**Primary kanban (top, full height, scrollable):**
- New, In Progress, Internal Review — these are the daily working columns
- Keep existing horizontal scroll kanban layout but give more vertical space

**Secondary row (below, collapsed/compact):**
- Client Approval, Scheduled/Published/Ready to Send/Sent/Complete
- Render as a horizontal row of smaller columns (not full-height kanban) or compact grid cards
- Each section is a drop zone with drag support
- Visually de-emphasized: smaller headers, condensed card style

### Drag-and-drop
- Already implemented on kanban columns and bottom grid sections via `handleDragStart`/`handleDrop`/`handleDragOver`
- Ensure **all** bottom sections always render (even when empty) so they remain valid drop targets
- Currently `if (sectionPosts.length === 0) return null` hides empty sections — remove this check, show empty state placeholder instead

### Specific changes
1. Split `KANBAN_COLUMNS` into primary (idea, in_progress, internal_review) and secondary (client_approval)
2. Move client_approval into `bottomSections` alongside scheduled/published
3. Remove the `if (sectionPosts.length === 0) return null` — always render sections as drop targets with a min-height placeholder
4. Render secondary sections as a horizontal flex row of compact columns (not full kanban height)
5. Give primary kanban `flex-1` to fill available vertical space

## Files

| Action | File |
|--------|------|
| Edit | `src/pages/Workflow.tsx` — restructure layout, always show drop zones, two-tier hierarchy |

No database changes.

