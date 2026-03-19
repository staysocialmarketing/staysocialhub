
-- Allow clients to insert their own brain_captures
CREATE POLICY "Clients can insert own captures"
  ON public.brain_captures FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (SELECT client_id FROM public.users WHERE id = auth.uid())
    AND client_id IS NOT NULL
  );

-- Allow clients to view their own brain_captures
CREATE POLICY "Clients can view own captures"
  ON public.brain_captures FOR SELECT TO authenticated
  USING (
    client_id = (SELECT client_id FROM public.users WHERE id = auth.uid())
  );
