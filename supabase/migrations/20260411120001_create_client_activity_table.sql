-- Create client_activity table (was created via dashboard, not in migrations)
CREATE TABLE IF NOT EXISTS public.client_activity (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_type       TEXT        NOT NULL DEFAULT '',
  title               TEXT        NOT NULL,
  description         TEXT,
  visible_to_client   BOOLEAN     NOT NULL DEFAULT false,
  created_by_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_activity ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_client_activity_client_id ON public.client_activity(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_created_at ON public.client_activity(created_at DESC);

-- SS team sees all activity; clients see only visible_to_client = true rows for their own client
CREATE POLICY "SS can view all client activity" ON public.client_activity
  FOR SELECT TO authenticated USING (public.is_ss_role());

CREATE POLICY "Clients see their own visible activity" ON public.client_activity
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND public.is_client_member(client_id));

CREATE POLICY "SS can insert client activity" ON public.client_activity
  FOR INSERT TO authenticated WITH CHECK (public.is_ss_role());
