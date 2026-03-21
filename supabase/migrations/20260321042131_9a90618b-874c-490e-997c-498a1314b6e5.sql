
CREATE TABLE public.generated_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'caption',
  prompt text NOT NULL DEFAULT '',
  tone_override text,
  output text NOT NULL DEFAULT '',
  saved_to_capture_id uuid REFERENCES public.brain_captures(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated content"
  ON public.generated_content FOR SELECT TO authenticated
  USING (can_access_client(client_id));

CREATE POLICY "Users can insert own generated content"
  ON public.generated_content FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND can_access_client(client_id));

CREATE POLICY "SS can manage generated content"
  ON public.generated_content FOR ALL TO authenticated
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

CREATE POLICY "Users can delete own generated content"
  ON public.generated_content FOR DELETE TO authenticated
  USING (user_id = auth.uid());
