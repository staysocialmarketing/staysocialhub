CREATE TABLE public.website_briefs (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  functionality_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspiration_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage website briefs" ON public.website_briefs
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own website brief" ON public.website_briefs
  FOR SELECT TO authenticated USING (can_access_client(client_id));