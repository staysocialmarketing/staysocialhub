
CREATE TABLE public.corporate_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'sop',
  content text NOT NULL DEFAULT '',
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can view corporate strategies"
  ON public.corporate_strategies FOR SELECT
  TO authenticated
  USING (public.is_ss_role());

CREATE POLICY "SS admin can manage corporate strategies"
  ON public.corporate_strategies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ss_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'ss_admin'));

CREATE TRIGGER update_corporate_strategies_updated_at
  BEFORE UPDATE ON public.corporate_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
