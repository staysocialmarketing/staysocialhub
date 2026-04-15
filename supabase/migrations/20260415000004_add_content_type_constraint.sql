ALTER TABLE public.posts
  ADD CONSTRAINT valid_content_type CHECK (
    content_type IS NULL OR content_type IN (
      -- existing social values
      'image', 'video', 'reel', 'carousel',
      -- existing email value
      'email_campaign',
      -- existing other values
      'ad_creative', 'landing_page', 'graphic_design',
      'website_update', 'general_task',
      -- new values
      'social_post', 'email', 'story', 'google_post'
    )
  );
