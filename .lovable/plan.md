

# Backend Setup + Personalization Plan

## Current State
- `corey@staysocial.ca` (id: `4275c710...`) — already has `ss_admin` role, name: "Corey at Stay Social"
- `corey.macvicar@premieremortgage.ca` (id: `3f9ce766...`) — no role, no client_id, name: "Corey MacVicar"
- Test Client exists (id: `f0a14b68...`)

## Database Changes

1. **Assign test account to Test Client as client_admin:**
   - Update `users` table: set `client_id` to the Test Client id for `corey.macvicar@premieremortgage.ca`
   - Insert `client_admin` role into `user_roles` for that user

2. **Fix admin name** (optional): Update name from "Corey at Stay Social" to "Corey" for cleaner display

## Frontend Personalization

Use first name (split on space, take first word) throughout the app:

3. **`src/pages/Dashboard.tsx`** — Already shows "Welcome back, {name}". Change to use first name only.

4. **`src/components/AppLayout.tsx`** — Replace static "Stay Social Client Hub" header with "Stay Social HUB" and remove that hardcoded text or make it contextual.

5. **`src/components/AppSidebar.tsx`** — Update "Client Hub" subtitle text to "HUB". Already shows user name/email in footer — keep that.

6. **Add a helper** to extract first name from full name across all pages, e.g. `profile.name?.split(' ')[0]`.

7. **Other pages** (Approvals, Requests, Profile) — Add personalized greeting headers where appropriate (e.g. "Your Requests", "Your Content").

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Assign client_id + client_admin role to test account |
| `src/pages/Dashboard.tsx` | Use first name in greeting |
| `src/components/AppLayout.tsx` | "Stay Social HUB" header |
| `src/components/AppSidebar.tsx` | "HUB" subtitle |

