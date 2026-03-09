-- Expand request_type enum
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'design';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'automation';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'strategy';
ALTER TYPE public.request_type ADD VALUE IF NOT EXISTS 'general';

-- Update auto_create_post_from_request to set content_type based on request type
CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ss_user record;
  _content_type text;
BEGIN
  CASE NEW.type::text
    WHEN 'social_post' THEN _content_type := 'image';
    WHEN 'email_campaign' THEN _content_type := 'email_campaign';
    WHEN 'video' THEN _content_type := 'video';
    WHEN 'design' THEN _content_type := 'graphic_design';
    ELSE _content_type := 'general_task';
  END CASE;

  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, content_type, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, _content_type, NEW.id);

  FOR _ss_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin','ss_producer','ss_ops','ss_team')
      AND ur.user_id IS DISTINCT FROM NEW.created_by_user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_ss_user.user_id, 'New request', NEW.topic, '/requests');
  END LOOP;
  RETURN NEW;
END;
$$;