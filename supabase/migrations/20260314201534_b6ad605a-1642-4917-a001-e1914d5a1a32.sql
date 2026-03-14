
-- Create approval_batches table
CREATE TABLE public.approval_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  batch_type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft',
  created_by_user_id uuid NOT NULL REFERENCES public.users(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage approval batches" ON public.approval_batches
  FOR ALL TO authenticated
  USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own batches" ON public.approval_batches
  FOR SELECT TO authenticated
  USING (is_client_member(client_id));

-- Create approval_batch_items junction table
CREATE TABLE public.approval_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.approval_batches(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, post_id)
);

ALTER TABLE public.approval_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage batch items" ON public.approval_batch_items
  FOR ALL TO authenticated
  USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own batch items" ON public.approval_batch_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.approval_batches ab
    WHERE ab.id = approval_batch_items.batch_id
    AND is_client_member(ab.client_id)
  ));

-- Add updated_at trigger
CREATE TRIGGER update_approval_batches_updated_at
  BEFORE UPDATE ON public.approval_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
