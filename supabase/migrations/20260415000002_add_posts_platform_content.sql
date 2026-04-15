ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS platform_content jsonb NOT NULL DEFAULT '{}'::jsonb;
