-- Add ss_agent role and create agent user accounts for Forge, Quill, Scout, Lev.
-- Agents appear in HUB's tag/mention selectors with a distinct role.
-- They do NOT have auth.users entries — system accounts only.

-- 1. Add ss_agent to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ss_agent';

-- 2. Insert agent profiles into public.users
--    Stable UUIDs so notification routing is deterministic.
INSERT INTO public.users (id, name, email)
VALUES
  ('00000000-0000-0000-0000-000000000f02', 'Forge',  'forge@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000q17', 'Quill',  'quill@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000s03', 'Scout',  'scout@staysocial.ca'),
  ('00000000-0000-0000-0000-000000000001', 'Lev',    'lev@staysocial.ca')
ON CONFLICT (id) DO UPDATE SET
  name  = EXCLUDED.name,
  email = EXCLUDED.email;

-- 3. Grant each agent the ss_agent role
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000f02', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000q17', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000s03', 'ss_agent'),
  ('00000000-0000-0000-0000-000000000001', 'ss_agent')
ON CONFLICT (user_id, role) DO NOTHING;
