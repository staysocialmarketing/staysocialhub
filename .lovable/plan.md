

# Client Success Center + Navigation Update

## Summary
Create a new Success Center page that provides clients a read-only summary of their marketing progress by pulling data from the existing `client_strategy` table. Add a new `client_success_extras` table for team-editable fields (recent wins, coming up next, current focus override). Update client sidebar navigation order.

## Database Migration

Create a new table `client_success_extras` to store the team-editable fields that don't belong in `client_strategy`:

```sql
CREATE TABLE public.client_success_extras (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  recent_wins jsonb NOT NULL DEFAULT '[]',
  coming_up_next jsonb NOT NULL DEFAULT '[]',
  focus_override text,
  recommended_next_step text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_success_extras ENABLE ROW LEVEL SECURITY;

-- SS can manage
CREATE POLICY "SS can manage client success extras" ON public.client_success_extras
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

-- Clients can view their own
CREATE POLICY "Clients can view own success extras" ON public.client_success_extras
  FOR SELECT TO authenticated USING (can_access_client(client_id));
```

This keeps strategy data in `client_strategy` and adds only the Success Center-specific fields (wins, upcoming, recommended step) in a new table. No data duplication.

## Data Mapping

| Success Center Section | Source |
|---|---|
| Current Focus | `client_strategy.focus_json.weekly_focus` (or `client_success_extras.focus_override` if set) |
| Goals | `client_strategy.goals_json.objectives` (split by newlines) |
| Active Priorities | `client_strategy.campaigns_json.notes` (split by newlines) |
| Recent Wins | `client_success_extras.recent_wins` (JSON array of strings) |
| Coming Up Next | `client_success_extras.coming_up_next` (JSON array of strings) |
| Your Plan | `clients.plan_id` → `plans.name` + `clients.recommended_item_id` → `marketplace_items` |
| Recommended Next Step | `client_success_extras.recommended_next_step` |

## Files

| Action | File | Change |
|---|---|---|
| Create | `src/pages/client/SuccessCenter.tsx` | Full page with 9 sections as specified. Clients see read-only; team/admin see inline edit controls for editable fields. Uses `useQuery` to fetch strategy + extras + plan data. |
| Edit | `src/components/AppSidebar.tsx` | Update `clientItems` array order: Dashboard, Success Center, Approvals, Requests, My Media, My Profile, My Plan, What's New |
| Edit | `src/App.tsx` | Add route `/client/success` pointing to `SuccessCenter`, accessible to all authenticated users |
| Migration | New table | `client_success_extras` as described above |

## Success Center Page Sections

1. **Hero** — Welcome card with client name, active plan badge, last updated date
2. **Current Focus** — Pulls from strategy `focus_json.weekly_focus`. Team can edit inline.
3. **Goals** — Pulls from strategy `goals_json.objectives`, displayed as a list. Read-only for all (managed in Strategy).
4. **Active Priorities** — Pulls from strategy `campaigns_json.notes`, displayed as cards/list. Read-only (managed in Strategy).
5. **Recent Wins** — From `client_success_extras.recent_wins`. Team can add/remove items.
6. **Coming Up Next** — From `client_success_extras.coming_up_next`. Team can add/remove items.
7. **Your Plan** — Shows plan name from `plans` table + recommended marketplace item as a soft suggestion card.
8. **Quick Actions** — Buttons linking to Submit Request, Approvals, My Media, and a "Book a Strategy Call" placeholder.
9. **Platform Updates** — Small footer card linking to `/whats-new`.

## Edit Permissions
- **Clients**: Entire page is read-only
- **Team/Admin (`isSSRole`)**: Can edit Current Focus (override), Recent Wins, Coming Up Next, Recommended Next Step via inline controls that save to `client_success_extras`
- **Goals & Active Priorities**: Always read-only on this page — managed via Admin → Client Strategy

