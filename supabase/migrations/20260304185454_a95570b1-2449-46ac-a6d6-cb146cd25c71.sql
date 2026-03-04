
-- Trigger function: auto-create a post in 'idea' status when a request is inserted
CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ss_user record;
BEGIN
  -- Create post in idea status
  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id);

  -- Notify all SS role users
  FOR _ss_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_producer', 'ss_ops')
      AND ur.user_id IS DISTINCT FROM NEW.created_by_user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_ss_user.user_id, 'New request', NEW.topic, '/requests');
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_auto_create_post_from_request
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_post_from_request();
