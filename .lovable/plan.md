

# Strategy → Success Center Sync

## Summary
Add per-section visibility toggles to the internal strategy page. Visible sections automatically appear in the client's Success Center as a "Current Focus" card. No duplicate data entry needed.

## Database Changes

### 1. Add `visible_sections` column to `client_strategy`
```sql
ALTER TABLE public.client_strategy 
  ADD COLUMN visible_sections jsonb NOT NULL DEFAULT '{}'::jsonb;
```
Stores which sections are client-visible, e.g. `{"goals": true, "pillars": true, "campaigns": false, "focus": false}`.

### 2. Add RLS policy for clients to read strategy
Currently only SS roles can access `client_strategy`. Clients need SELECT access to show visible items in Success Center.
```sql
CREATE POLICY "Clients can view own strategy"
  ON public.client_strategy FOR SELECT
  USING (can_access_client(client_id));
```

## Frontend Changes

### `src/pages/admin/ClientStrategy.tsx`
- Add `visible_sections` state object tracking toggles for: goals, focus, pillars, campaigns
- Load from strategy data on mount
- For each section header, add a Switch toggle labeled "Visible to Client" (only shown for SS admin/team)
- When a section is toggled visible, show a small "Visible to Client" outline badge
- Save `visible_sections` alongside existing strategy payload

### `src/pages/client/SuccessCenter.tsx`
- Read `visible_sections` from the already-fetched strategy data
- Between the "Current Focus" and "Goals" cards, render a new "Strategy Highlights" card
- This card shows only sections where `visible_sections[key]` is true:
  - Goals → bullet list from `goals_json.objectives`
  - Focus → text from `focus_json.weekly_focus`  
  - Pillars → badge list from `pillars_json`
  - Campaigns → bullet list from `campaigns_json.notes`
- If no sections are visible, hide the card entirely
- Client-only view (read-only, no edit controls)

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `client_strategy` | Add `visible_sections` column + client SELECT RLS |
| Edit | `src/pages/admin/ClientStrategy.tsx` | Add Switch toggles per section, save visible_sections |
| Edit | `src/pages/client/SuccessCenter.tsx` | Show visible strategy sections in new card |

