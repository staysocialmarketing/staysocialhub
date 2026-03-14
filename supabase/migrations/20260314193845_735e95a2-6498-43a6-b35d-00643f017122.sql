
CREATE TABLE public.allowed_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by_user_id uuid REFERENCES public.users(id)
);

ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage allowed domains"
  ON public.allowed_domains
  FOR ALL
  TO authenticated
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

CREATE POLICY "Authenticated can view allowed domains"
  ON public.allowed_domains
  FOR SELECT
  TO authenticated
  USING (true);

-- Pre-populate with staysocial.ca
INSERT INTO public.allowed_domains (domain) VALUES ('staysocial.ca');
