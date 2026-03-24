

# Ensuring Client Signups Work End-to-End

## What Happened with Dave

From the auth logs: Dave McCarron (`dave@premiereinsurance.ca`) successfully signed up via Google OAuth. The `handle_new_user` trigger created his record in the `users` table. However, the `fetchProfile` function in `AuthContext` runs `checkDomainAllowed` — if `premiereinsurance.ca` is not in the `allowed_domains` table, the user is immediately signed out with an error toast.

**This is working as designed** — the domain whitelist is your access gate. You need to:
1. Add `premiereinsurance.ca` to Allowed Domains (Admin → Users page)
2. Create the client record
3. Assign Dave's user to that client (`client_id`) and give him the `client_admin` role

## Current Gaps in the Signup Flow

After reviewing the full auth flow, there are two issues that could trip up new client signups:

### Issue 1: No role = empty dashboard with no navigation
When a new client user signs up and you assign them a `client_id` but forget to add a role, they land on `ClientDashboard` (since `isSSRole` is false). The sidebar shows client nav items. This actually works — but if `client_id` is null (not yet assigned), all queries return empty because they're gated on `profile?.client_id`.

**No code fix needed** — this is correct behavior. The admin assigns `client_id` + role after signup.

### Issue 2: Client users without `client_id` see a blank dashboard
If a user has a `client_admin` role but no `client_id` set, the dashboard shows "Hey, Dave 👋" with all zeros and empty sections. There's no guidance telling them to wait for setup.

### Fix: Show a "setup pending" state for users with no client_id

**`src/pages/Dashboard.tsx`** — In `ClientDashboard`, add an early return when `profile?.client_id` is null:
- Show a friendly message: "We're setting up your account. You'll have access shortly."
- This prevents confusion for newly signed-up client users before the admin assigns them

### No other changes needed
- The `handle_new_user` trigger correctly creates user records on signup
- Domain whitelist + role assignment is admin-controlled (by design)
- Google OAuth and Magic Link both work through the same `onAuthStateChange` → `fetchProfile` flow

## Files Changed

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add "account setup pending" state in `ClientDashboard` when `client_id` is null |

