ALTER TABLE public.clients 
  ADD COLUMN health_override text DEFAULT NULL,
  ADD COLUMN health_override_at timestamptz DEFAULT NULL;