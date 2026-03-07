
-- 1. Create marketplace_items table
CREATE TABLE public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'upgrade',
  icon text,
  price text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marketplace items" ON public.marketplace_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "SS can manage marketplace items" ON public.marketplace_items
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

-- 2. Add recommended_item_id to clients
ALTER TABLE public.clients
  ADD COLUMN recommended_item_id uuid REFERENCES public.marketplace_items(id);

-- 3. Add assigned_to_team to tasks
ALTER TABLE public.tasks ADD COLUMN assigned_to_team boolean NOT NULL DEFAULT false;

-- 4. Create trigger for updated_at on marketplace_items
CREATE TRIGGER update_marketplace_items_updated_at
  BEFORE UPDATE ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
