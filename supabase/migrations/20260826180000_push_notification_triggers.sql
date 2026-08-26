-- Push notification triggers for Corey
-- Fires send-push-notification edge function on qualifying events:
--   1. Post moves to corey_review status
--   2. New row inserted in decision_queue

-- Add push_enabled to notification_preferences (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_preferences'
      AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD COLUMN push_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- Helper: call send-push-notification edge function via pg_net
-- ============================================================
CREATE OR REPLACE FUNCTION public._send_corey_push(
  p_title text,
  p_body text,
  p_url text DEFAULT 'https://hub.staysocial.ca'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_key text;
  v_supabase_url text;
BEGIN
  v_service_key := coalesce(
    current_setting('supabase.service_role_key', true),
    current_setting('app.settings.service_role_key', true)
  );
  v_supabase_url := current_setting('app.settings.supabase_url', true);

  IF v_service_key IS NULL OR v_supabase_url IS NULL THEN
    RAISE WARNING '_send_corey_push: missing service key or supabase url, skipping';
    RETURN;
  END IF;

  BEGIN
    PERFORM extensions.net.http_post(
      url := v_supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'title', p_title,
        'body',  p_body,
        'url',   p_url
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '_send_corey_push failed: %', SQLERRM;
  END;
END;
$$;

-- ============================================================
-- Trigger 1: Post moves to corey_review
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_post_corey_review_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_name text;
  v_post_url text;
BEGIN
  -- Only fire on status change TO corey_review
  IF (TG_OP = 'UPDATE' AND OLD.status_column = NEW.status_column) THEN
    RETURN NEW;
  END IF;
  IF NEW.status_column != 'corey_review' THEN
    RETURN NEW;
  END IF;

  -- Get client name for notification
  SELECT c.name INTO v_client_name
    FROM public.clients c
   WHERE c.id = NEW.client_id;

  v_post_url := 'https://hub.staysocial.ca/pipeline/' || NEW.id::text;

  PERFORM public._send_corey_push(
    p_title := 'Post ready for review',
    p_body  := coalesce(v_client_name || ': ', '') || coalesce(left(NEW.title, 80), 'Untitled post'),
    p_url   := v_post_url
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_corey_review_push ON public.posts;
CREATE TRIGGER on_post_corey_review_push
  AFTER INSERT OR UPDATE OF status_column ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_corey_review_push();


-- ============================================================
-- Trigger 2: New decision_queue item
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_decision_queue_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public._send_corey_push(
    p_title := 'Decision needed',
    p_body  := left(NEW.summary, 120),
    p_url   := 'https://hub.staysocial.ca/tasks'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_decision_queue_insert_push ON public.decision_queue;
CREATE TRIGGER on_decision_queue_insert_push
  AFTER INSERT ON public.decision_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_decision_queue_push();
