
-- Assignments columns
ALTER TABLE posts ADD COLUMN assigned_to_user_id uuid;
ALTER TABLE posts ADD COLUMN reviewer_user_id uuid;

-- Due dates
ALTER TABLE posts ADD COLUMN due_at timestamptz;

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Trigger function: notify on status change
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.assigned_to_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
    IF NEW.reviewer_user_id IS NOT NULL AND NEW.reviewer_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.reviewer_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_status_notify
  AFTER UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_on_status_change();

-- Trigger function: notify on comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _post record;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT id, title, assigned_to_user_id, created_by_user_id INTO _post FROM posts WHERE id = NEW.post_id;
    -- Notify assigned user if not the commenter
    IF _post.assigned_to_user_id IS NOT NULL AND _post.assigned_to_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (_post.assigned_to_user_id, 'New comment', 'Comment on ' || _post.title, '/approvals/' || _post.id);
    END IF;
    -- Notify post creator if not the commenter and different from assigned
    IF _post.created_by_user_id IS NOT NULL AND _post.created_by_user_id != NEW.user_id AND _post.created_by_user_id IS DISTINCT FROM _post.assigned_to_user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (_post.created_by_user_id, 'New comment', 'Comment on ' || _post.title, '/approvals/' || _post.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comment_notify
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
