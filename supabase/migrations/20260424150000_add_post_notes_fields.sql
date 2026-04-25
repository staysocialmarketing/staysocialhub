-- ============================================================
-- Add notes fields to posts table
--
-- notes          TEXT  — client-facing notes for the post
-- design_notes   TEXT  — design team instructions (Canva / manual)
-- design_prompts JSONB — AI image/video generation prompts
--                        (Higgsfield + GPT Image 2 JSON)
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS design_notes    TEXT,
  ADD COLUMN IF NOT EXISTS design_prompts  JSONB;

COMMENT ON COLUMN public.posts.notes IS
  'Client-facing notes for this post.';

COMMENT ON COLUMN public.posts.design_notes IS
  'Design team instructions — Canva work, manual edits needed, etc.';

COMMENT ON COLUMN public.posts.design_prompts IS
  'AI image/video generation prompts (Higgsfield + GPT Image 2 JSON).';
