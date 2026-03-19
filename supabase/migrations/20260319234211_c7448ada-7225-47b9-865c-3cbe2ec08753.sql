
-- Mirror brain_captures into universal_inbox for team visibility
CREATE OR REPLACE FUNCTION public.mirror_capture_to_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _source text;
  _client_name text;
BEGIN
  CASE NEW.type
    WHEN 'voice' THEN _source := 'voice_note';
    WHEN 'file' THEN _source := 'screenshot';
    WHEN 'link' THEN _source := 'quick_capture';
    ELSE _source := 'quick_capture';
  END CASE;

  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;

  INSERT INTO public.universal_inbox (
    source_type, title, raw_input_text, attachment_url,
    voice_transcript, suggested_client, status,
    created_by_user_id
  ) VALUES (
    _source,
    COALESCE(NULLIF(NEW.content, ''), 'Capture from ' || COALESCE(_client_name, 'unknown')),
    NEW.content,
    NEW.attachment_url,
    NEW.voice_transcript,
    _client_name,
    'new',
    NEW.created_by_user_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mirror_capture_to_inbox
  AFTER INSERT ON public.brain_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_capture_to_inbox();

-- Notify SS admins when a client submits a capture
CREATE OR REPLACE FUNCTION public.notify_ss_on_client_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_user record;
  _client_name text;
  _notif_key text;
  _is_client boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.created_by_user_id
      AND role IN ('ss_admin','ss_producer','ss_ops','ss_team')
  ) INTO _is_client;

  IF NOT _is_client THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;

  FOR _admin_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_producer')
  LOOP
    _notif_key := 'capture:' || NEW.id || ':for:' || _admin_user.user_id;
    INSERT INTO public.notifications (user_id, title, body, link, notification_key)
    VALUES (
      _admin_user.user_id,
      'New capture from ' || COALESCE(_client_name, 'client'),
      COALESCE(NULLIF(NEW.content, ''), 'Voice note or file upload'),
      '/team/inbox',
      _notif_key
    )
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ss_on_client_capture
  AFTER INSERT ON public.brain_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ss_on_client_capture();
