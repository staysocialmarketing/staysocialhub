
CREATE TABLE public.client_success_extras (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  recent_wins jsonb NOT NULL DEFAULT '[]'::jsonb,
  coming_up_next jsonb NOT NULL DEFAULT '[]'::jsonb,
  focus_override text,
  recommended_next_step text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_success_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage client success extras" ON public.client_success_extras
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own success extras" ON public.client_success_extras
  FOR SELECT TO authenticated USING (can_access_client(client_id));

CREATE TRIGGER update_client_success_extras_updated_at
  BEFORE UPDATE ON public.client_success_extras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
