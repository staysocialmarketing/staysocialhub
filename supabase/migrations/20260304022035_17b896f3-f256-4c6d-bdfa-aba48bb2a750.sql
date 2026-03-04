
-- Recreate post_status enum with new values
-- Step 1: Rename old enum
ALTER TYPE public.post_status RENAME TO post_status_old;

-- Step 2: Create new enum
CREATE TYPE public.post_status AS ENUM (
  'idea', 'writing', 'design', 'internal_review',
  'client_approval', 'request_changes', 'approved', 'scheduled', 'published'
);

-- Step 3: Alter column using a mapping expression
ALTER TABLE public.posts
  ALTER COLUMN status_column DROP DEFAULT,
  ALTER COLUMN status_column TYPE public.post_status
    USING (
      CASE status_column::text
        WHEN 'new_requests' THEN 'idea'
        WHEN 'content_process' THEN 'writing'
        WHEN 'design_process' THEN 'design'
        WHEN 'content_for_approval' THEN 'client_approval'
        WHEN 'in_the_queue' THEN 'scheduled'
        ELSE status_column::text
      END
    )::public.post_status,
  ALTER COLUMN status_column SET DEFAULT 'idea'::public.post_status;

-- Step 4: Drop old enum
DROP TYPE public.post_status_old;
