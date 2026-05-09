-- Add design_type field to posts table
-- Controls whether design is handled by Higgsfield (auto), Gavin (gavin), or unassigned (unset)
-- Posts cannot move to Design status until design_type is set (enforced in app layer)

-- Step 1: add column (idempotent — no inline CHECK so a pre-existing column doesn't silently skip it)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS design_type TEXT DEFAULT 'unset';

-- Step 2: backfill any NULLs so NOT NULL can be enforced
UPDATE public.posts SET design_type = 'unset' WHERE design_type IS NULL;

-- Step 3: enforce NOT NULL (CHECK passes on NULL, so this is the real guard)
ALTER TABLE public.posts ALTER COLUMN design_type SET NOT NULL;

-- Step 4: add named CHECK constraint idempotently via catalog check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'posts_design_type_check'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_design_type_check
        CHECK (design_type IN ('auto', 'gavin', 'unset'));
  END IF;
END $$;
