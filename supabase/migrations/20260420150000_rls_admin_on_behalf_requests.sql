-- RLS: allow ss_admins to submit requests on behalf of clients in View As mode
-- Adds submitted_on_behalf_by audit column + acting_on_behalf_of_client() helper
-- Updates the requests INSERT policy to accept either normal self-insert OR admin-on-behalf-of-client
--
-- Scope: requests table only (P1 fix for Monday onboarding).
-- approvals, comments, profile_update_requests, brain_captures: separate PR next week.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS submitted_on_behalf_by UUID REFERENCES auth.users(id);

-- Semantic wrapper: caller is an ss_role user with access to the target client.
-- Used in INSERT policies to allow admins to submit on behalf of clients in View As mode.
CREATE OR REPLACE FUNCTION public.acting_on_behalf_of_client(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_ss_role() AND public.can_access_client(_client_id);
$$;

-- Drop old policy (checked: created_by_user_id = auth.uid() AND can_access_client(client_id))
DROP POLICY IF EXISTS "Insert requests" ON public.requests;

-- New policy: normal client self-insert OR ss_admin acting on behalf of a client
CREATE POLICY "Insert requests" ON public.requests
FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_client(client_id)
  AND (
    created_by_user_id = auth.uid()
    OR (public.acting_on_behalf_of_client(client_id) AND submitted_on_behalf_by = auth.uid())
  )
);

-- Sparse index — only rows where an admin submitted on behalf of a client
CREATE INDEX IF NOT EXISTS idx_requests_submitted_on_behalf_by
  ON public.requests(submitted_on_behalf_by)
  WHERE submitted_on_behalf_by IS NOT NULL;

COMMENT ON COLUMN public.requests.submitted_on_behalf_by IS
  'When an ss_admin submits in View As mode, this holds their real user ID. NULL for direct client submissions.';

COMMENT ON FUNCTION public.acting_on_behalf_of_client IS
  'Returns true when the caller is an ss_role user with access to the target client. Used in INSERT policies to allow admins to submit on behalf of clients in View As mode.';
