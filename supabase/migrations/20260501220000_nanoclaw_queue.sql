-- nanoclaw_queue: persistent queue for agent notifications
-- Populated by DB trigger when a client submits a request (posts INSERT where source='client_request').
-- Lev polls via agent-bridge /read-queue and marks items processed/failed via /update-queue-item.

CREATE TABLE IF NOT EXISTS public.nanoclaw_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT        NOT NULL DEFAULT 'client_request',
  post_id         UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  client_id       UUID        NOT NULL REFERENCES public.clients(id),
  title           TEXT,
  content_type    TEXT,
  priority        TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nanoclaw_queue_status ON public.nanoclaw_queue(status, created_at);

ALTER TABLE public.nanoclaw_queue ENABLE ROW LEVEL SECURITY;

-- Only service role (agent-bridge) accesses this table — no client/user RLS needed.
-- Agents operate via service key which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Trigger: enqueue client requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_enqueue_client_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'client_request' THEN
    INSERT INTO public.nanoclaw_queue (post_id, client_id, title, content_type, priority)
    VALUES (NEW.id, NEW.client_id, NEW.title, NEW.content_type, NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_client_request ON public.posts;
CREATE TRIGGER trg_enqueue_client_request
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_enqueue_client_request();
