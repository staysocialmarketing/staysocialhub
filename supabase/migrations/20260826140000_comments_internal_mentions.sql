-- Add internal flag and mentions to comments.
-- is_internal: SS-team-only notes, hidden from client views.
-- mentions: UUID array of tagged users who get a "you were mentioned" notification.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';

-- Update the notification trigger to respect is_internal and handle mentions.
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_post_title text;
  v_post_client_id uuid;
  v_post_assigned uuid;
  v_post_reviewer uuid;
  v_commenter_name text;
  v_comment_body text;
  v_recipient_ids uuid[];
  v_mention_ids uuid[];
  v_link text;
  v_service_key text;
  v_is_internal boolean;
BEGIN
  IF NEW.post_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_post_id       := NEW.post_id;
  v_comment_body  := NEW.body;
  v_is_internal   := COALESCE(NEW.is_internal, false);
  v_mention_ids   := COALESCE(NEW.mentions, '{}');

  SELECT p.title, p.client_id, p.assigned_to_user_id, p.reviewer_user_id
    INTO v_post_title, v_post_client_id, v_post_assigned, v_post_reviewer
    FROM public.posts p
   WHERE p.id = v_post_id;

  v_post_title := COALESCE(v_post_title, 'Untitled Post');

  SELECT COALESCE(u.name, u.email) INTO v_commenter_name
    FROM public.users u WHERE u.id = NEW.user_id;

  v_commenter_name := COALESCE(v_commenter_name, 'Someone');

  v_link := '/pipeline/' || v_post_id::text;

  -- Build recipient list (all ss_admin + assignee + reviewer + thread participants)
  SELECT COALESCE(array_agg(ur.user_id), '{}') INTO v_recipient_ids
    FROM public.user_roles ur
   WHERE ur.role = 'ss_admin' AND ur.user_id != NEW.user_id;

  IF v_post_assigned IS NOT NULL AND v_post_assigned != NEW.user_id
     AND NOT (v_post_assigned = ANY(v_recipient_ids)) THEN
    v_recipient_ids := v_recipient_ids || v_post_assigned;
  END IF;

  IF v_post_reviewer IS NOT NULL AND v_post_reviewer != NEW.user_id
     AND NOT (v_post_reviewer = ANY(v_recipient_ids)) THEN
    v_recipient_ids := v_recipient_ids || v_post_reviewer;
  END IF;

  v_recipient_ids := v_recipient_ids || COALESCE(
    (SELECT array_agg(DISTINCT c.user_id)
       FROM public.comments c
      WHERE c.post_id = v_post_id
        AND c.user_id != NEW.user_id
        AND c.id != NEW.id
        AND NOT (c.user_id = ANY(v_recipient_ids))),
    '{}'::uuid[]
  );

  -- For public comments only: add client users
  IF NOT v_is_internal AND v_post_client_id IS NOT NULL THEN
    v_recipient_ids := v_recipient_ids || COALESCE(
      (SELECT array_agg(u.id)
         FROM public.users u
        WHERE u.client_id = v_post_client_id
          AND u.id != NEW.user_id
          AND NOT (u.id = ANY(v_recipient_ids))),
      '{}'::uuid[]
    );
  END IF;

  -- Deduplicate and remove nulls
  SELECT COALESCE(array_agg(DISTINCT x), '{}') INTO v_recipient_ids
    FROM unnest(v_recipient_ids) x WHERE x IS NOT NULL;

  IF array_length(v_recipient_ids, 1) IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT
      rid,
      CASE WHEN v_is_internal
        THEN 'Internal note on "' || left(v_post_title, 50) || '"'
        ELSE 'New comment on "' || left(v_post_title, 50) || '"'
      END,
      v_commenter_name || ': ' || left(v_comment_body, 200),
      v_link
    FROM unnest(v_recipient_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
       WHERE np.user_id = rid AND np.in_app_enabled = false
    );
  END IF;

  -- Send "you were mentioned" notifications to tagged users not already notified
  IF array_length(v_mention_ids, 1) IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT
      mid,
      v_commenter_name || ' mentioned you in "' || left(v_post_title, 50) || '"',
      left(v_comment_body, 200),
      v_link
    FROM unnest(v_mention_ids) AS mid
    WHERE mid != NEW.user_id
      AND NOT (mid = ANY(COALESCE(v_recipient_ids, '{}')))
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
         WHERE np.user_id = mid AND np.in_app_enabled = false
      );
  END IF;

  -- Email dispatch
  BEGIN
    v_service_key := COALESCE(
      current_setting('supabase.service_role_key', true),
      current_setting('app.settings.service_role_key', true)
    );
    IF v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://ktyjtbivycjkklkrcudb.supabase.co/functions/v1/send-comment-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'comment_id', NEW.id,
          'post_id', v_post_id,
          'post_title', v_post_title,
          'commenter_name', v_commenter_name,
          'comment_body', v_comment_body,
          'recipient_ids', to_jsonb(v_recipient_ids),
          'mention_ids', to_jsonb(v_mention_ids),
          'is_internal', v_is_internal
        )
      );
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'send-comment-email call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
