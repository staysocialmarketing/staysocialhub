CREATE TABLE public.post_images (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id             UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path        TEXT        NOT NULL,
  url                 TEXT        NOT NULL,
  position            INT         NOT NULL DEFAULT 0,
  alt_text            TEXT,
  created_by_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_post_images_post_id    ON public.post_images(post_id);
CREATE INDEX idx_post_images_position   ON public.post_images(post_id, position);

-- SS team has full CRUD; clients can only read images that belong to their own posts
CREATE POLICY "SS can manage post images" ON public.post_images
  FOR ALL TO authenticated
  USING (public.is_ss_role()) WITH CHECK (public.is_ss_role());

CREATE POLICY "Clients can view post images" ON public.post_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND public.can_access_client(p.client_id)
    )
  );
