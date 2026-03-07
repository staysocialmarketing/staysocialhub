
-- Migrate existing data
UPDATE public.posts SET status_column = 'in_progress' WHERE status_column IN ('writing', 'design', 'request_changes');
UPDATE public.posts SET status_column = 'scheduled' WHERE status_column = 'approved';
