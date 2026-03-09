
ALTER TABLE public.client_strategy 
  ADD COLUMN visible_sections jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow clients to read their own strategy (for Success Center display)
CREATE POLICY "Clients can view own strategy"
  ON public.client_strategy FOR SELECT
  USING (can_access_client(client_id));
