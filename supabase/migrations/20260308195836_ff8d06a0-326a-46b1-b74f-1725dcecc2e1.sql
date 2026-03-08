
-- Create client_strategy table
CREATE TABLE public.client_strategy (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  goals_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  focus_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pillars_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaigns_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  studio_notes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_strategy ENABLE ROW LEVEL SECURITY;

-- SS roles full CRUD
CREATE POLICY "SS can manage client strategy"
  ON public.client_strategy FOR ALL
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

-- Trigger for updated_at
CREATE TRIGGER update_client_strategy_updated_at
  BEFORE UPDATE ON public.client_strategy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
