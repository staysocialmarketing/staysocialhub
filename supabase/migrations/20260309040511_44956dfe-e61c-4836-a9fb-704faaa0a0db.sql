CREATE TABLE public.client_onboarding (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title       text NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- SS can do everything
CREATE POLICY "SS can manage onboarding" ON public.client_onboarding
  FOR ALL USING (is_ss_role()) WITH CHECK (is_ss_role());

-- Clients can view their own
CREATE POLICY "Clients can view onboarding" ON public.client_onboarding
  FOR SELECT USING (can_access_client(client_id));