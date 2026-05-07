-- Add design_type field to posts table
-- Controls whether design is handled by Higgsfield (auto), Gavin (gavin), or unassigned (unset)
-- Posts cannot move to Design status until design_type is set (enforced in app layer)

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS design_type TEXT DEFAULT 'unset'
    CHECK (design_type IN ('auto', 'gavin', 'unset'));
