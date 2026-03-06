
-- 1. Update auto_create_post_from_request: set assigned_to_user_id = NULL for idea
CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ss_user record;
BEGIN
  -- Create post in idea status, UNASSIGNED, linked to request
  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, assigned_to_user_id, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, NULL, NEW.id);

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

-- 2. Replace auto_reassign_on_design with a combined trigger that handles writing, design, and internal_review
CREATE OR REPLACE FUNCTION public.auto_reassign_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _target_id uuid;
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    -- Writing -> assign to ss_producer
    IF NEW.status_column = 'writing' THEN
      SELECT ur.user_id INTO _target_id
      FROM public.user_roles ur
      WHERE ur.role = 'ss_producer'
      LIMIT 1;
      IF _target_id IS NOT NULL THEN
        NEW.assigned_to_user_id := _target_id;
      END IF;

    -- Design -> assign to ss_ops
    ELSIF NEW.status_column = 'design' THEN
      SELECT ur.user_id INTO _target_id
      FROM public.user_roles ur
      WHERE ur.role = 'ss_ops'
      LIMIT 1;
      IF _target_id IS NOT NULL THEN
        NEW.assigned_to_user_id := _target_id;
      END IF;

    -- Internal Review -> assign to ss_admin
    ELSIF NEW.status_column = 'internal_review' THEN
      SELECT ur.user_id INTO _target_id
      FROM public.user_roles ur
      WHERE ur.role = 'ss_admin'
      LIMIT 1;
      IF _target_id IS NOT NULL THEN
        NEW.assigned_to_user_id := _target_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop the old trigger
DROP TRIGGER IF EXISTS trg_auto_reassign_on_design ON public.posts;

-- Create the new combined trigger
CREATE TRIGGER trg_auto_reassign_on_status_change
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reassign_on_status_change();
