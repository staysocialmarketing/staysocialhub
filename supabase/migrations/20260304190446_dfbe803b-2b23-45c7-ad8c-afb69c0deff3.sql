
-- Add missing foreign keys on posts table for assigned_to_user_id and reviewer_user_id
ALTER TABLE public.posts
  ADD CONSTRAINT posts_assigned_to_user_id_fkey
  FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);

ALTER TABLE public.posts
  ADD CONSTRAINT posts_reviewer_user_id_fkey
  FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id);
