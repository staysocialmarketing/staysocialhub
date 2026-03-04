
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
    -- Existing: notify assigned user
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.assigned_to_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
    -- Existing: notify reviewer
    IF NEW.reviewer_user_id IS NOT NULL AND NEW.reviewer_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.reviewer_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;

    -- NEW: When moved to internal_review, notify all ss_admin users
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

    -- NEW: When moved to client_approval, notify client_admin users for that client
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

-- Ensure trigger exists on posts
DROP TRIGGER IF EXISTS trigger_notify_on_status_change ON posts;
CREATE TRIGGER trigger_notify_on_status_change
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();
