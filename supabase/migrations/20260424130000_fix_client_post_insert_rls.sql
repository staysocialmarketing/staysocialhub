-- ============================================================
-- Fix: allow authenticated clients to INSERT posts where
--      source = 'client_request' (broken by unify migration
--      20260423000001 which renamed requests → requests_archive
--      but did not add a corresponding INSERT policy on posts).
--
-- Bug: clients hit "new row violates row-level security policy
--      for table 'posts'" when submitting content requests from
--      the client portal (/requests page, Requests.tsx).
--
-- Root cause: the only posts INSERT policy is "SS can insert posts"
--   which gates on is_ss_role(). No policy exists for clients.
--
-- Fix:
--   1. Add "Clients can insert client_request posts" policy that
--      allows authenticated client users to insert rows where
--      source = 'client_request', client_id matches their own
--      client record, and created_by_user_id = their auth.uid().
--
--   2. Add a second INSERT policy clause to also allow SS admins
--      acting on behalf of clients (View As mode) — matching the
--      pattern established in the old requests table policy.
--
-- Existing "SS can insert posts" policy is LEFT INTACT.
-- Multiple INSERT policies on a table are OR-ed by Postgres.
-- ============================================================

-- Policy 1: Client self-insert (client_admin / client_assistant)
-- Allows a client user to create a post for their own client_id
-- as long as source = 'client_request'.
CREATE POLICY "Clients can insert client_request posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'client_request'
    AND public.can_access_client(client_id)
    AND created_by_user_id = auth.uid()
  );

-- Policy 2: SS admin on-behalf-of-client insert
-- Allows an SS admin in View As mode to submit on behalf of a client.
-- The submitted_on_behalf_by column (added in 20260420150000) is
-- repurposed here the same way it was used on the requests table.
--
-- NOTE: submitted_on_behalf_by does not exist on posts yet — added below.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS submitted_on_behalf_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_posts_submitted_on_behalf_by
  ON public.posts(submitted_on_behalf_by)
  WHERE submitted_on_behalf_by IS NOT NULL;

COMMENT ON COLUMN public.posts.submitted_on_behalf_by IS
  'When an ss_admin submits in View As mode, this holds their real user ID. NULL for direct client submissions.';

-- Policy 3: SS admin submitting on behalf of a client in View As mode
CREATE POLICY "SS can insert client_request posts on behalf of client"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'client_request'
    AND public.acting_on_behalf_of_client(client_id)
    AND submitted_on_behalf_by = auth.uid()
  );
