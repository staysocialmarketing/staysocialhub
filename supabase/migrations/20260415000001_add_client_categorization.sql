ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS niche    text,
  ADD COLUMN IF NOT EXISTS company  text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS region   text;
