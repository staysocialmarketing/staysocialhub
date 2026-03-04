
-- Add content_type and request_id columns to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.requests(id);

-- Update the auto_create_post_from_request trigger to auto-assign ss_producer and link request_id
CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ss_user record;
  _producer_id uuid;
BEGIN
  -- Find the first ss_producer user for auto-assignment
  SELECT ur.user_id INTO _producer_id
  FROM public.user_roles ur
  WHERE ur.role = 'ss_producer'
  LIMIT 1;

  -- Create post in idea status, auto-assigned to producer, linked to request
  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, assigned_to_user_id, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, _producer_id, NEW.id);

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
$function$;

-- Create auto_reassign_on_design trigger function
CREATE OR REPLACE FUNCTION public.auto_reassign_on_design()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ops_id uuid;
BEGIN
  -- When status changes to 'design', reassign to ss_ops user (Gavin)
  IF OLD.status_column IS DISTINCT FROM NEW.status_column AND NEW.status_column = 'design' THEN
    SELECT ur.user_id INTO _ops_id
    FROM public.user_roles ur
    WHERE ur.role = 'ss_ops'
    LIMIT 1;

    IF _ops_id IS NOT NULL THEN
      NEW.assigned_to_user_id := _ops_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_reassign_on_design ON public.posts;
CREATE TRIGGER trg_auto_reassign_on_design
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reassign_on_design();
