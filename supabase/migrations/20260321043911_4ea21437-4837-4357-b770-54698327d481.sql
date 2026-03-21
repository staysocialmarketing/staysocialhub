
-- 1. Content metrics table
CREATE TABLE public.content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  engagement integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  reported_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage content metrics" ON public.content_metrics
  FOR ALL TO authenticated
  USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own metrics" ON public.content_metrics
  FOR SELECT TO authenticated
  USING (can_access_client(client_id));

-- 2. Notify client on request status change trigger
CREATE OR REPLACE FUNCTION public.notify_client_on_request_status_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _notif_key text;
  _client_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;
    _notif_key := 'request:' || NEW.id || ':status:' || NEW.status || ':for:' || NEW.created_by_user_id;
    INSERT INTO public.notifications (user_id, title, body, link, notification_key)
    VALUES (
      NEW.created_by_user_id,
      'Request update',
      'Your request "' || NEW.topic || '" is now ' || replace(NEW.status::text, '_', ' '),
      '/requests',
      _notif_key
    )
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_request_status
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_request_status_change();
