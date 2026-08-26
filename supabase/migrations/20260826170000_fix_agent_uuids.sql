-- Fix: migration 20260826150000 used invalid hex chars in agent UUIDs.
-- UUIDs are hex-only (0-9, a-f). 'q' and 's' are invalid.
-- This migration uses the correct UUIDs and re-inserts cleanly.

-- Remove any partial inserts from the broken migration (safe — ON CONFLICT handles doubles)
DELETE FROM public.user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-000000000f02',
  '00000000-0000-0000-0000-000000000q17',
  '00000000-0000-0000-0000-000000000s03',
  '00000000-0000-0000-0000-000000000001'
) AND role = 'ss_agent';

DELETE FROM public.users WHERE id IN (
  '00000000-0000-0000-0000-000000000f02',
  '00000000-0000-0000-0000-000000000q17',
  '00000000-0000-0000-0000-000000000s03',
  '00000000-0000-0000-0000-000000000001'
);

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
