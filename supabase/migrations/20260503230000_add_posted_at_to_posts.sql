-- Add posted_at timestamp to posts
-- Records when a post was marked as posted/sent by an SS team member.
-- Nullable — only set when explicitly marked via "Mark as Posted" action.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
