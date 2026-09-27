-- Add the ss_agent role. Agents appear in HUB's tag/mention selectors with a distinct role
-- and have no auth.users entries; they are system accounts only.
--
-- Only the enum value lives here. Postgres will not let a migration add an enum value and
-- use it in the same transaction, and the original agent rows in this file used non-hex
-- UUIDs, so the accounts are created in 20260826170000_fix_agent_uuids.sql instead.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ss_agent';
