
-- 1. task_checklist_items
CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can manage task checklist items" ON public.task_checklist_items FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

-- 2. task_attachments
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can manage task attachments" ON public.task_attachments FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

-- 3. task_activity_log
CREATE TABLE public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can view task activity" ON public.task_activity_log FOR SELECT TO authenticated USING (is_ss_role());
CREATE POLICY "SS can insert task activity" ON public.task_activity_log FOR INSERT TO authenticated WITH CHECK (is_ss_role());

-- 4. Add task_id to comments
ALTER TABLE public.comments ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 5. Update comments RLS policies to include task-based access
DROP POLICY IF EXISTS "Insert comments" ON public.comments;
CREATE POLICY "Insert comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) AND (
      is_ss_role()
      OR (EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND can_access_client(p.client_id)))
      OR (EXISTS (SELECT 1 FROM requests r WHERE r.id = comments.request_id AND can_access_client(r.client_id)))
    )
  );

DROP POLICY IF EXISTS "View comments" ON public.comments;
CREATE POLICY "View comments" ON public.comments FOR SELECT TO authenticated
  USING (
    is_ss_role()
    OR (EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND can_access_client(p.client_id)))
    OR (EXISTS (SELECT 1 FROM requests r WHERE r.id = comments.request_id AND can_access_client(r.client_id)))
  );

-- 6. Activity log trigger
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status || ' → ' || NEW.status);
  END IF;
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'reassigned', 'Assignee changed');
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority || ' → ' || NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_task_changes BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_task_changes();
