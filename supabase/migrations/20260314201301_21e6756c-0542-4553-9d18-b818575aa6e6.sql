
-- 1. Create notification_preferences table
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  daily_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification prefs"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification prefs"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "SS can view all notification prefs"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (is_ss_role());

-- 2. Add notification_key to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup ON public.notifications (notification_key) WHERE notification_key IS NOT NULL;

-- 3. Allow SS roles to insert notifications (needed for batch RPC calls from client)
DROP POLICY IF EXISTS "SS can insert notifications" ON public.notifications;
CREATE POLICY "SS can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_ss_role());

-- 4. Update notify_on_status_change to add dedup and remove client_approval per-item notifications
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_user record;
  _notif_key text;
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    -- Notify assigned user (deduped)
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      _notif_key := 'post:' || NEW.id || ':to:' || NEW.status_column::text || ':for:' || NEW.assigned_to_user_id;
      INSERT INTO notifications (user_id, title, body, link, notification_key)
      VALUES (NEW.assigned_to_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id,
        _notif_key)
      ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
    END IF;

    -- Notify reviewer (deduped)
    IF NEW.reviewer_user_id IS NOT NULL AND NEW.reviewer_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      _notif_key := 'post:' || NEW.id || ':to:' || NEW.status_column::text || ':for:' || NEW.reviewer_user_id;
      INSERT INTO notifications (user_id, title, body, link, notification_key)
      VALUES (NEW.reviewer_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id,
        _notif_key)
      ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
    END IF;

    -- When moved to internal_review, notify all ss_admin users
    IF NEW.status_column = 'internal_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
          AND ur.user_id IS DISTINCT FROM NEW.assigned_to_user_id
          AND ur.user_id IS DISTINCT FROM NEW.reviewer_user_id
      LOOP
        _notif_key := 'post:' || NEW.id || ':to:internal_review:for:' || _admin_user.user_id;
        INSERT INTO notifications (user_id, title, body, link, notification_key)
        VALUES (_admin_user.user_id,
          'Ready for review',
          NEW.title || ' is ready for internal review',
          '/approvals',
          _notif_key)
        ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
      END LOOP;
    END IF;

    -- When moved to corey_review, notify all ss_admin users
    IF NEW.status_column = 'corey_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
          AND ur.user_id IS DISTINCT FROM NEW.assigned_to_user_id
          AND ur.user_id IS DISTINCT FROM NEW.reviewer_user_id
      LOOP
        _notif_key := 'post:' || NEW.id || ':to:corey_review:for:' || _admin_user.user_id;
        INSERT INTO notifications (user_id, title, body, link, notification_key)
        VALUES (_admin_user.user_id,
          'Ready for Corey Review',
          NEW.title || ' is ready for your review',
          '/approvals',
          _notif_key)
        ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
      END LOOP;
    END IF;

    -- REMOVED: per-item client_approval notification
    -- Clients will only be notified via batch notifications now
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Create batch notification helper: notify_batch_sent_to_client
CREATE OR REPLACE FUNCTION public.notify_batch_sent_to_client(
  _batch_name text,
  _client_id uuid,
  _item_count int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _client_user record;
  _admin_user record;
  _notif_key text;
BEGIN
  -- Notify client_admin users for this client
  FOR _client_user IN
    SELECT u.id FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.client_id = _client_id AND ur.role = 'client_admin'
  LOOP
    _notif_key := 'batch_sent:' || _batch_name || ':client:' || _client_id || ':for:' || _client_user.id;
    INSERT INTO notifications (user_id, title, body, link, notification_key)
    VALUES (_client_user.id,
      'Content ready for review',
      'Your next batch of content (' || _item_count || ' items) is ready for review in the Stay Social HUB.',
      '/approvals',
      _notif_key)
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END LOOP;

  -- Notify SS admins
  FOR _admin_user IN
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
  LOOP
    _notif_key := 'batch_sent:' || _batch_name || ':admin:' || _admin_user.user_id;
    INSERT INTO notifications (user_id, title, body, link, notification_key)
    VALUES (_admin_user.user_id,
      'Batch sent to client',
      'Batch "' || _batch_name || '" (' || _item_count || ' items) sent to client',
      '/approvals',
      _notif_key)
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END LOOP;
END;
$function$;

-- 6. Create batch client response notification helper
CREATE OR REPLACE FUNCTION public.notify_batch_client_response(
  _batch_name text,
  _client_id uuid,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _admin_user record;
  _notif_key text;
  _title text;
  _body text;
BEGIN
  IF _action = 'approved' THEN
    _title := 'Batch approved';
    _body := 'Client approved batch "' || _batch_name || '"';
  ELSE
    _title := 'Batch needs changes';
    _body := 'Client requested changes on batch "' || _batch_name || '"';
  END IF;

  FOR _admin_user IN
    SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('ss_admin', 'ss_producer', 'ss_ops')
  LOOP
    _notif_key := 'batch_response:' || _batch_name || ':' || _action || ':for:' || _admin_user.user_id;
    INSERT INTO notifications (user_id, title, body, link, notification_key)
    VALUES (_admin_user.user_id, _title, _body, '/approvals', _notif_key)
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END LOOP;
END;
$function$;
