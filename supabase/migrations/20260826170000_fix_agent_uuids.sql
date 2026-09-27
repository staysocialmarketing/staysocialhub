-- Agent accounts (Lev, Forge, Quill, Scout) were meant to be inserted here as HUB users
-- with no login. That cannot work: public.users.id is a foreign key to auth.users, so a
-- migration cannot create them. Production never applied the original version of this file.
--
-- Agent accounts are created through Supabase Auth instead (the admin-users edge function
-- or the dashboard), then given the ss_agent role in public.user_roles. The mention routing
-- in 20260826160000 keys off that role and works once such users exist.
--
-- This file is kept as a no-op so migration history stays aligned across environments.
DO $$ BEGIN NULL; END $$;
