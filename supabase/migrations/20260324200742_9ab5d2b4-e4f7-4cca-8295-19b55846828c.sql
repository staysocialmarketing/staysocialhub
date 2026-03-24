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
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1))
  );

  _domain := lower(split_part(NEW.email, '@', 2));

  SELECT u.client_id INTO _matched_client_id
  FROM public.users u
  WHERE lower(split_part(u.email, '@', 2)) = _domain
    AND u.client_id IS NOT NULL
    AND u.id != NEW.id
  LIMIT 1;

  IF _matched_client_id IS NOT NULL THEN
    UPDATE public.users SET client_id = _matched_client_id WHERE id = NEW.id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;