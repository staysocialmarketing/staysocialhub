

# Client Health Indicators

## Summary
Add automatic client health status (Active / Needs Attention / Inactive) based on recent activity across requests, approvals, and tasks. Display as colored dots with tooltips on client cards. Admin can manually override.

## Database Changes

### Migration
```sql
-- Add health override column to clients table
ALTER TABLE public.clients 
  ADD COLUMN health_override text DEFAULT NULL,
  ADD COLUMN health_override_at timestamptz DEFAULT NULL;
```
`health_override` stores manual override value (`active`, `needs_attention`, `inactive`) or NULL for auto-calculated. Only admins set this.

No new tables needed — health is computed client-side from existing activity data.

## Frontend Changes

### New component: `src/components/ClientHealthIndicator.tsx`
- Accepts `clientId` and optional `override` prop
- Queries recent activity counts with a single parallel fetch:
  - `requests` where `client_id = X` and `created_at > 30 days ago` → count
  - `approvals` joined through `posts` where `client_id = X` and `created_at > 30 days ago` → count  
  - `tasks` where `client_id = X` and `updated_at > 30 days ago` → count
- Calculates health:
  - If `override` is set, use override value
  - If any activity within 14 days → Active (green dot)
  - If activity between 14-30 days → Needs Attention (yellow dot)
  - If no activity in 30+ days → Inactive (red dot)
- Renders a small colored circle with a `Tooltip` showing status label and explanation
- If override is active, shows a small "Manual" badge

### Edit: `src/pages/admin/AdminClients.tsx`
- Import `ClientHealthIndicator`
- Add health dot next to client name in each card (line ~579, next to Building2 icon)
- In the Edit Client dialog, add a "Health Override" select for admins:
  - Options: Auto (default), Active, Needs Attention, Inactive
  - Save `health_override` on update
- Include `health_override` in the client query and edit form state

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `clients` | Add `health_override` and `health_override_at` columns |
| Create | `src/components/ClientHealthIndicator.tsx` | Health dot component with tooltip |
| Edit | `src/pages/admin/AdminClients.tsx` | Show health indicator on cards, add override in edit dialog |

