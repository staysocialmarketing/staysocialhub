
CREATE TABLE public.brain_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  content text NOT NULL DEFAULT '',
  attachment_url text,
  attachment_name text,
  voice_transcript text,
  link_url text,
  notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  converted_to_request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage brain captures"
  ON public.brain_captures
  FOR ALL
  TO authenticated
  USING (is_ss_role())
  WITH CHECK (is_ss_role());

CREATE INDEX idx_brain_captures_client_id ON public.brain_captures(client_id);
CREATE INDEX idx_brain_captures_created_at ON public.brain_captures(created_at DESC);
