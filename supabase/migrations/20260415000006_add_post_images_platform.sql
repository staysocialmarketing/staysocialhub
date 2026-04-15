-- NULL means the image is shared across all platforms
ALTER TABLE public.post_images
  ADD COLUMN platform TEXT;
