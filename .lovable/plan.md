

# Auto-Assign Client Role on New Signups

## Problem
When a new client user signs up, the `handle_new_user` trigger creates their `users` row but assigns no role and no `client_id`. The admin must manually do both in the Users page. This is error-prone and creates a limbo state.

## Solution
Update the `handle_new_user` trigger to automatically match new signups to their client and assign `client_admin` role based on domain matching.

### How it works
1. When a new user signs up, extract their email domain
2. Check if that domain exists in `allowed_domains`
3. Look up if any existing client user shares that domain (to find the `client_id`)
4. If a match is found: set `client_id` on the new user and insert a `client_admin` role
5. If no match: user still gets created (current behavior), admin assigns manually

This means: once you add `premiereinsurance.ca` to allowed domains AND assign Dave to his client, the next person from that company who signs up will automatically get linked to the same client with `client_admin` role.

### Database Migration

Update `handle_new_user()` function:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain text;
  _matched_client_id uuid;
BEGIN
  -- Create user record
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1))
  );

  -- Try to auto-assign client based on domain
  _domain := lower(split_part(NEW.email, '@', 2));

  -- Find an existing user with same domain who has a client_id
  SELECT u.client_id INTO _matched_client_id
  FROM public.users u
  WHERE lower(split_part(u.email, '@', 2)) = _domain
    AND u.client_id IS NOT NULL
    AND u.id != NEW.id
  LIMIT 1;

  IF _matched_client_id IS NOT NULL THEN
    -- Link new user to same client
    UPDATE public.users SET client_id = _matched_client_id WHERE id = NEW.id;

    -- Assign client_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
```

### No code changes needed
- The "setup pending" screen in Dashboard already handles the case where `client_id` is still null (first user from a new company)
- The AuthContext domain whitelist check still gates access
- SS domain users (staysocial.ca etc.) won't match any client, so they remain unassigned as expected

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Update `handle_new_user()` to auto-assign `client_id` + `client_admin` role via domain matching |

