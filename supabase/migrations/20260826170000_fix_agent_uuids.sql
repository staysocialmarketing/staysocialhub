-- Agent accounts for Lev, Forge, Quill and Scout with stable hex UUIDs, so notification
-- routing is deterministic. The ss_agent enum value comes from 20260826150000; the original
-- draft of that file used non-hex UUIDs ('q', 's'), which is why the rows are created here.

-- Remove the one row the original draft could have created under its old id.
DELETE FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000f02' AND role = 'ss_agent';
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000f02';

-- Insert with valid hex UUIDs
INSERT INTO public.users (id, name, email)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lev',   'lev@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000002', 'Forge', 'forge@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000003', 'Quill', 'quill@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000004', 'Scout', 'scout@staysocial.ca')
ON CONFLICT (id) DO UPDATE SET
  name  = EXCLUDED.name,
  email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000002', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000003', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000004', 'ss_agent')
ON CONFLICT (user_id, role) DO NOTHING;
