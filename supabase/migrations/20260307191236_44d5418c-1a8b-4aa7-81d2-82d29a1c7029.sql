
-- Add new post_status enum values
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ready_to_send';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'complete';

-- Add email-specific columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS subject_line text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS preview_text text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS email_body text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audience text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS send_date timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS campaign_link text;
