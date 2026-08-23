-- Corey Notification System
-- 1. decision_queue table — agents submit, Corey resolves
-- 2. push_subscriptions table — Web Push VAPID endpoints
-- 3. daily digest helper view

-- ============================================================
-- 1. decision_queue
-- ============================================================
CREATE TABLE public.decision_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  source TEXT NOT NULL, -- 'lev', 'forge', 'vincent', 'system'
  summary TEXT NOT NULL, -- one-line description shown in digest/Telegram
  context TEXT,          -- longer explanation if needed
  related_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')) NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);

ALTER TABLE public.decision_queue ENABLE ROW LEVEL SECURITY;

-- SS admins (Corey) can read and update all items
CREATE POLICY "ss_admin can manage decision_queue"
  ON public.decision_queue
  FOR ALL
  TO authenticated
  USING (public.is_ss_role())
  WITH CHECK (public.is_ss_role());

-- Any authenticated user can insert (agents write decisions)
CREATE POLICY "authenticated can insert decision_queue"
  ON public.decision_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role has full access (edge functions)
CREATE POLICY "service role full access decision_queue"
  ON public.decision_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime — so Corey's HUB updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_queue;

-- Index for common queries
CREATE INDEX idx_decision_queue_status ON public.decision_queue(status);
CREATE INDEX idx_decision_queue_priority ON public.decision_queue(priority);


-- ============================================================
-- 2. push_subscriptions
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "users can manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role for sending from edge functions
CREATE POLICY "service role push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 3. corey_action_queue view — what the digest queries
--    Pulls three buckets: posts needing review, client feedback, overdue tasks
-- ============================================================
CREATE OR REPLACE VIEW public.corey_action_queue AS

-- Bucket 1: Posts in corey_review status (needs Corey's eyes)
SELECT
  'post_review'::text AS item_type,
  'high'::text AS priority,
  p.id AS ref_id,
  p.title AS summary,
  '/pipeline/' || p.id::text AS link,
  p.created_at AS item_created_at,
  c.name AS client_name
FROM public.posts p
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE p.status_column IN ('corey_review', 'internal_review')

UNION ALL

-- Bucket 2: Pending decisions in decision_queue
SELECT
  'decision'::text AS item_type,
  dq.priority,
  dq.id AS ref_id,
  dq.summary,
  '/tasks'::text AS link,
  dq.created_at AS item_created_at,
  dq.source AS client_name
FROM public.decision_queue dq
WHERE dq.status = 'pending'

UNION ALL

-- Bucket 3: Overdue tasks assigned to any user (admins see all)
SELECT
  'overdue_task'::text AS item_type,
  'medium'::text AS priority,
  t.id AS ref_id,
  t.title AS summary,
  '/tasks'::text AS link,
  t.due_at AS item_created_at,
  NULL::text AS client_name
FROM public.tasks t
WHERE t.due_at < now()
  AND t.status NOT IN ('done', 'complete', 'cancelled');
