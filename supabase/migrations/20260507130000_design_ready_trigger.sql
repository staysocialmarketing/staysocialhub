-- Design ready queue trigger
-- Fires when a post transitions to status='design' with design_type='auto'.
-- Inserts a design_ready event into nanoclaw_queue for Lev to poll and trigger Higgsfield.
-- Does NOT touch the Sprint 1 trigger (fn_enqueue_client_request / trg_enqueue_client_request).

CREATE OR REPLACE FUNCTION public.fn_enqueue_design_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on a genuine transition into design status with design_type=auto
  IF NEW.status_column = 'design'
     AND NEW.design_type = 'auto'
     AND (OLD.status_column IS DISTINCT FROM 'design' OR OLD.design_type IS DISTINCT FROM 'auto')
  THEN
    INSERT INTO public.nanoclaw_queue (event_type, post_id, client_id, title, content_type)
    VALUES ('design_ready', NEW.id, NEW.client_id, NEW.title, NEW.content_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_design_ready ON public.posts;
CREATE TRIGGER trg_enqueue_design_ready
  AFTER UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_enqueue_design_ready();
