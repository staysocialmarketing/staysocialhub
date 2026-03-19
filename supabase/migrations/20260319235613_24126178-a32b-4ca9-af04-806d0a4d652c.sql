
-- Brain interviews table for AI Interview chat sessions
CREATE TABLE public.brain_interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  started_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'full_onboarding',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_data jsonb DEFAULT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.brain_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage brain interviews"
  ON public.brain_interviews FOR ALL
  TO authenticated
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

-- Updated at trigger
CREATE TRIGGER set_brain_interviews_updated_at
  BEFORE UPDATE ON public.brain_interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
