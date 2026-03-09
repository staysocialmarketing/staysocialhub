-- Performance indexes on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_requests_client_id ON public.requests (client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests (created_at);

CREATE INDEX IF NOT EXISTS idx_posts_client_id ON public.posts (client_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_column ON public.posts (status_column);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks (client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks (assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON public.comments (request_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);

-- Storage RLS: restrict uploads on creative-assets to authenticated users
CREATE POLICY "Authenticated users can upload creative assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creative-assets');

CREATE POLICY "Anyone can view creative assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creative-assets');

CREATE POLICY "SS can delete creative assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'creative-assets' AND public.is_ss_role());

-- Storage RLS: request-attachments bucket
CREATE POLICY "Authenticated users can upload request attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

CREATE POLICY "Users can view request attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

CREATE POLICY "SS can delete request attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'request-attachments' AND public.is_ss_role());