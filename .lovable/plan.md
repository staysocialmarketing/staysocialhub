

# Fix: Dave Can't Log In — Missing Role Assignment

## Problem
Dave (`dave@premiereinsurance.ca`) has:
- ✅ Account created via Google OAuth
- ✅ Domain whitelisted (`premiereinsurance.ca`)
- ✅ `client_id` assigned (`38b151b0...` → "Dave McCarron" client)
- ❌ **No role in `user_roles` table** — this is why he can't access anything

Without a role, the auth context returns empty `roles[]`, so the app doesn't know to show him the client dashboard.

## Immediate Fix (Data Insert)
Insert the `client_admin` role for Dave's user ID:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('d2cf64c1-ce95-4619-91a8-b037ca351b98', 'client_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

This is a data operation, not a schema change.

## Why This Happened
The `handle_new_user` trigger was updated to auto-assign roles AFTER Dave had already signed up. His original signup used the old trigger which only created the user record. The auto-assignment only works for future signups where another user from the same domain already has a `client_id`.

## Regarding "Client User" Role
The current role system has `client_admin` and `client_assistant`. There is no generic `client_user` role. `client_admin` is the standard role for client contacts — it gives them full access to their own client dashboard, approvals, requests, etc. `client_assistant` is for secondary contacts with limited permissions (e.g., can't approve unless `assistants_can_approve` is enabled on the client record).

No new role type is needed — `client_admin` covers Dave's use case.

## Also: Rename Client Record
The client record is named "Dave McCarron" — you may want to rename it to his company name (e.g., "Premiere Insurance") from the Admin → Clients page. This is just a display name issue.

## Files Changed

| File | Change |
|---|---|
| Data insert (not migration) | Add `client_admin` role for Dave's user ID |

