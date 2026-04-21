-- ============================================================
-- Fix: add ss_manager to all SS-team RLS policies and triggers
-- ============================================================
-- Context: ss_manager was added to the app_role enum in migration
-- 20260421180000_add_ss_manager_role.sql but was never included in
-- the is_ss_role() helper function or any hardcoded role lists.
-- This caused users with ss_manager (e.g. Tristan) to authenticate
-- successfully but see no data — every RLS policy blocked them.
--
-- Tables covered by is_ss_role() (fixed via function update):
--   plans, clients, users, user_roles, posts, post_versions,
--   comments, approvals, requests, client_profile,
--   profile_update_requests, addon_requests, think_tank_items,
--   projects, tasks, task_checklist_items, task_attachments,
--   task_activity_log, marketplace_items, workflow_stage_assignments,
--   platform_versions, universal_inbox, team_settings (SELECT),
--   team_roles_config (SELECT), team_growth_tracks (SELECT),
--   team_wins (SELECT), client_strategy, client_success_extras,
--   brand_twin, website_briefs, allowed_domains, brain_captures,
--   generated_content, content_metrics, client_activity,
--   post_images, automation_rules (SELECT), corporate_strategies (SELECT),
--   notification_preferences (SELECT), notifications (INSERT),
--   storage objects (voice-notes)
--
-- Tables with hardcoded role lists (fixed explicitly below):
--   agent_status, agents
--
-- Trigger functions updated to include ss_manager in notification
-- fan-outs (so Tristan receives relevant alerts):
--   auto_create_post_from_request, notify_on_status_change,
--   notify_batch_sent_to_client, notify_batch_client_response,
--   notify_ss_on_client_capture
-- ============================================================


-- ── 1. Update is_ss_role() ───────────────────────────────────────────────────
-- This is the central gatekeeper. Adding ss_manager here fixes all policies
-- that delegate to this function — the majority of the schema.

CREATE OR REPLACE FUNCTION public.is_ss_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team', 'ss_manager')
  )
$$;


-- ── 2. Fix agent_status hardcoded policy ────────────────────────────────────
-- The "public read agent_status" policy (added later) already allows open
-- reads, but we fix the original policy for correctness and future-proofing.

DROP POLICY IF EXISTS "ss_roles can read agent_status" ON public.agent_status;

CREATE POLICY "ss_roles can read agent_status"
  ON public.agent_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('ss_admin', 'ss_team', 'ss_producer', 'ss_ops', 'ss_manager')
    )
  );


-- ── 3. Fix agents table hardcoded policy ────────────────────────────────────

DROP POLICY IF EXISTS "ss_roles can read agents" ON public.agents;

CREATE POLICY "ss_roles can read agents"
  ON public.agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('ss_admin', 'ss_team', 'ss_producer', 'ss_ops', 'ss_manager')
    )
  );


-- ── 4. Update trigger: auto_create_post_from_request ────────────────────────
-- Fans out new-request notifications to all SS team members.
-- ss_manager should receive these.

CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ss_user record;
  _content_type text;
BEGIN
  CASE NEW.type::text
    WHEN 'social_post'    THEN _content_type := 'image';
    WHEN 'email_campaign' THEN _content_type := 'email_campaign';
    WHEN 'video'          THEN _content_type := 'video';
    WHEN 'design'         THEN _content_type := 'graphic_design';
    ELSE                       _content_type := 'general_task';
  END CASE;

  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, content_type, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, _content_type, NEW.id);

  FOR _ss_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team', 'ss_manager')
      AND ur.user_id IS DISTINCT FROM NEW.created_by_user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_ss_user.user_id, 'New request', NEW.topic, '/requests');
  END LOOP;
  RETURN NEW;
END;
$$;


-- ── 5. Update trigger: notify_on_status_change ──────────────────────────────
-- Notifies ss_admin on internal_review and corey_review transitions.
-- ss_manager should also be notified of these key workflow events.

CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _admin_user record;
  _notif_key  text;
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

    -- When moved to internal_review, notify ss_admin and ss_manager users
    IF NEW.status_column = 'internal_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur
        WHERE ur.role IN ('ss_admin', 'ss_manager')
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

    -- When moved to corey_review, notify ss_admin and ss_manager users
    IF NEW.status_column = 'corey_review' THEN
      FOR _admin_user IN
        SELECT ur.user_id FROM user_roles ur
        WHERE ur.role IN ('ss_admin', 'ss_manager')
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

  END IF;
  RETURN NEW;
END;
$function$;


-- ── 6. Update function: notify_batch_sent_to_client ─────────────────────────
-- Notifies ss_admin when a batch is sent to a client.
-- ss_manager should also receive this alert.

CREATE OR REPLACE FUNCTION public.notify_batch_sent_to_client(
  _batch_name text,
  _client_id  uuid,
  _item_count int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _client_user record;
  _admin_user  record;
  _notif_key   text;
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

  -- Notify ss_admin and ss_manager
  FOR _admin_user IN
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_manager')
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


-- ── 7. Update function: notify_batch_client_response ────────────────────────
-- Notifies SS team when a client responds to a batch.
-- Was targeting ss_admin/ss_producer/ss_ops — update to use is_ss_role()
-- equivalent to catch all SS roles including ss_manager.

CREATE OR REPLACE FUNCTION public.notify_batch_client_response(
  _batch_name text,
  _client_id  uuid,
  _action     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _admin_user record;
  _notif_key  text;
  _title      text;
  _body       text;
BEGIN
  IF _action = 'approved' THEN
    _title := 'Batch approved';
    _body  := 'Client approved batch "' || _batch_name || '"';
  ELSE
    _title := 'Batch needs changes';
    _body  := 'Client requested changes on batch "' || _batch_name || '"';
  END IF;

  FOR _admin_user IN
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team', 'ss_manager')
  LOOP
    _notif_key := 'batch_response:' || _batch_name || ':' || _action || ':for:' || _admin_user.user_id;
    INSERT INTO notifications (user_id, title, body, link, notification_key)
    VALUES (_admin_user.user_id, _title, _body, '/approvals', _notif_key)
    ON CONFLICT (notification_key) WHERE notification_key IS NOT NULL DO NOTHING;
  END LOOP;
END;
$function$;


-- ── 8. Update function: notify_ss_on_client_capture ─────────────────────────
-- Notifies SS team when a client submits a brain capture.
-- The "is SS role" check should include ss_manager (so captures from
-- ss_manager users are not treated as client captures).
-- The notification fan-out is expanded to include ss_manager.

CREATE OR REPLACE FUNCTION public.notify_ss_on_client_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_user  record;
  _client_name text;
  _notif_key   text;
  _is_client   boolean;
BEGIN
  -- Return early if the submitter is an SS team member
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.created_by_user_id
      AND role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team', 'ss_manager')
  ) INTO _is_client;

  IF NOT _is_client THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;

  FOR _admin_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_manager')
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
