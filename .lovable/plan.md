
# Client Onboarding Tracker

## Summary
Create a new `client_onboarding` table to store per-client checklist items (with completion state), then build a reusable `OnboardingTracker` component used in two places: (1) the Admin client list as a new "Onboarding" button/dialog per client row, and (2) the client `SuccessCenter` page as a read-only progress section.

## Database Changes

### Migration
```sql
CREATE TABLE public.client_onboarding (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title       text NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- SS can do everything
CREATE POLICY "SS can manage onboarding" ON public.client_onboarding
  FOR ALL USING (is_ss_role()) WITH CHECK (is_ss_role());

-- Clients can view their own
CREATE POLICY "Clients can view onboarding" ON public.client_onboarding
  FOR SELECT USING (can_access_client(client_id));
```

Default steps are seeded per-client when a new onboarding dialog is opened and the table is empty for that client (insert-on-first-open approach, not a DB seed).

## New Component: `src/components/OnboardingTracker.tsx`

Props: `clientId`, `isAdmin` (bool), `compact` (bool — for client SuccessCenter view)

Features:
- Fetches `client_onboarding` for the `clientId`
- On first load (empty result), inserts the 8 default steps in order
- Calculates: `completed = items.filter(i => i.completed).length`, `total = items.length`
- Derives status: 0 done → "Not Started", some done → "In Progress", all done → "Completed"
- Renders:
  - Status badge (Not Started / In Progress / Completed)
  - Progress bar (`Progress` component) with "X of Y steps completed" label
  - Checklist: each item is a `Checkbox` + label row. `isAdmin` → SS can toggle. Clients get read-only display.
  - If `isAdmin` (ss_admin only): Add Step input + delete (X) button per step

### Mutations (admin only):
- Toggle complete: `UPDATE client_onboarding SET completed = !prev, completed_at = now()` 
- Add step: `INSERT` with next sort_order
- Delete step: `DELETE` by id

### Default Steps (inserted on first open):
1. Brand voice defined
2. Strategy created
3. Client goals documented
4. Content pillars identified
5. First social posts planned
6. First email campaign planned
7. Media assets uploaded
8. Hub training completed

## AdminClients.tsx Changes

- Add "Onboarding" button to each client card row (next to Activity button), visible to both SS Admin and Team
- Add a `Dialog` (similar to the Activity dialog pattern already used) that renders `<OnboardingTracker clientId={c.id} isAdmin={isSSAdmin} />`
- State: `onboardingClientId`, `onboardingClientName`

## SuccessCenter.tsx Changes

- Add an "Onboarding Progress" `Card` near the top of the page (after the hero/strategy highlight), before the Current Focus card
- Renders `<OnboardingTracker clientId={clientId} isAdmin={false} compact />` — read-only, clients see progress only
- Only shown when `clientId` is available

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `client_onboarding` | New table with RLS |
| Create | `src/components/OnboardingTracker.tsx` | Reusable tracker component |
| Edit | `src/pages/admin/AdminClients.tsx` | Add Onboarding button + dialog to client cards |
| Edit | `src/pages/client/SuccessCenter.tsx` | Add read-only onboarding section near top |
