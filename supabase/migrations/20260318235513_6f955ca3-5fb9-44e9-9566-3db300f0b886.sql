
CREATE TABLE public.brand_twin (
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE PRIMARY KEY,
  brand_basics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand_voice_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  offers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_material_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_twin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage brand twin"
  ON public.brand_twin
  FOR ALL
  TO authenticated
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

CREATE TRIGGER update_brand_twin_updated_at
  BEFORE UPDATE ON public.brand_twin
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
