

# Restore Approvals Nav + Remove Secondary Tier from Workflow

## What happened
I mistakenly removed "Approvals" from the sidebar for everyone. The user wants:
- **Admin**: Keep Approvals in sidebar (they need to track client approvals, scheduled, published)
- **Team**: Remove Approvals from sidebar (they just use Workflow)
- **Workflow page**: Remove the bottom secondary row (Client Approval, Scheduled, Published) — staff only need the 3 primary columns (New, In Progress, Internal Review)

## Changes

### 1. `src/components/AppSidebar.tsx`
- Add Approvals back to `menuSection`
- In `renderMenuItems` or the internal-user nav section, conditionally hide Approvals for non-admin team members (`isSSTeam && !isSSAdmin`)

### 2. `src/pages/Workflow.tsx`
- Remove `getBottomSections()` function and the entire secondary tier rendering (the compact horizontal row with Client Approval, Scheduled, Published, etc.)
- Keep only the 3 `PRIMARY_COLUMNS` kanban: New, In Progress, Internal Review
- Remove associated drag handlers for the bottom sections
- This simplifies the page significantly — just the 3-column kanban with drag-and-drop

## Files

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add Approvals back, hide it only for team (non-admin) roles |
| `src/pages/Workflow.tsx` | Remove secondary tier sections entirely |

