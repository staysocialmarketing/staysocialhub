-- Add corey_review to post_status enum after internal_review
ALTER TYPE public.post_status ADD VALUE 'corey_review' AFTER 'internal_review';

-- Update notify_on_status_change to notify ss_admin when entering corey_review
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _client_user record;
  _admin_user record;
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    -- Notify assigned user
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.assigned_to_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
    -- Notify reviewer
    IF NEW.reviewer_user_id IS NOT NULL AND NEW.reviewer_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.reviewer_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;

    -- When moved to internal_review, notify all ss_admin users
    IF NEW.status_column = 'internal_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
          AND ur.user_id IS DISTINCT FROM NEW.assigned_to_user_id
          AND ur.user_id IS DISTINCT FROM NEW.reviewer_user_id
      LOOP
        INSERT INTO notifications (user_id, title, body, link)
        VALUES (_admin_user.user_id,
          'Ready for review',
          NEW.title || ' is ready for internal review',
          '/approvals');
      END LOOP;
    END IF;

    -- When moved to corey_review, notify all ss_admin users
    IF NEW.status_column = 'corey_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
          AND ur.user_id IS DISTINCT FROM NEW.assigned_to_user_id
          AND ur.user_id IS DISTINCT FROM NEW.reviewer_user_id
      LOOP
        INSERT INTO notifications (user_id, title, body, link)
        VALUES (_admin_user.user_id,
          'Ready for Corey Review',
          NEW.title || ' is ready for your review',
          '/approvals');
      END LOOP;
    END IF;

    -- When moved to client_approval, notify client_admin users for that client
    IF NEW.status_column = 'client_approval' THEN
      FOR _client_user IN
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.client_id = NEW.client_id
          AND ur.role = 'client_admin'
      LOOP
        INSERT INTO notifications (user_id, title, body, link)
        VALUES (_client_user.id,
          'Content ready for approval',
          NEW.title || ' is ready for your review',
          '/approvals');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update log_client_activity_on_post_status to handle corey_review (not visible to clients)
CREATE OR REPLACE FUNCTION public.log_client_activity_on_post_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _type text;
  _title text;
  _visible boolean := true;
BEGIN
  IF OLD.status_column IS NOT DISTINCT FROM NEW.status_column THEN
    RETURN NEW;
  END IF;

  CASE NEW.status_column::text
    WHEN 'internal_review' THEN _type := 'internal_review_completed'; _title := NEW.title || ' moved to internal review'; _visible := false;
    WHEN 'corey_review' THEN _type := 'corey_review'; _title := NEW.title || ' moved to Corey review'; _visible := false;
    WHEN 'client_approval' THEN _type := 'approval_completed'; _title := NEW.title || ' is ready for your approval'; _visible := true;
    WHEN 'scheduled' THEN _type := 'content_scheduled'; _title := NEW.title || ' has been scheduled'; _visible := true;
    WHEN 'ready_to_schedule' THEN _type := 'content_scheduled'; _title := NEW.title || ' is ready to schedule'; _visible := false;
    WHEN 'published' THEN _type := 'content_published'; _title := NEW.title || ' has been published'; _visible := true;
    WHEN 'sent' THEN _type := 'email_sent'; _title := NEW.title || ' has been sent'; _visible := true;
    WHEN 'in_progress' THEN _type := 'request_status_changed'; _title := NEW.title || ' moved to in progress'; _visible := false;
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO public.client_activity (client_id, activity_type, title, visible_to_client, created_by_user_id)
  VALUES (NEW.client_id, _type, _title, _visible, auth.uid());

  RETURN NEW;
END;
$function$;