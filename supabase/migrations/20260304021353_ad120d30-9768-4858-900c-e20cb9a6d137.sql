
CREATE TABLE public.addon_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addon_name text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View addon requests"
  ON public.addon_requests FOR SELECT
  USING (can_access_client(client_id));

CREATE POLICY "Insert addon requests"
  ON public.addon_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND can_access_client(client_id));

CREATE POLICY "SS can update addon requests"
  ON public.addon_requests FOR UPDATE
  USING (is_ss_role());

CREATE POLICY "SS can delete addon requests"
  ON public.addon_requests FOR DELETE
  USING (is_ss_role());
