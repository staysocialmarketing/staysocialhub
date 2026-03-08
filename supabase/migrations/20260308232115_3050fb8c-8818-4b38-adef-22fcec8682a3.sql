
CREATE OR REPLACE FUNCTION public.log_task_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'project_changed',
      CASE
        WHEN NEW.project_id IS NULL THEN 'Removed from project'
        ELSE 'Linked to project: ' || COALESCE((SELECT name FROM projects WHERE id = NEW.project_id), 'Unknown')
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_task_from_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task_id uuid;
BEGIN
  INSERT INTO public.tasks (title, client_id, status, priority, created_by_user_id, request_id)
  VALUES (NEW.topic, NEW.client_id, 'todo', COALESCE(NEW.priority, 'normal'), NEW.created_by_user_id, NEW.id)
  RETURNING id INTO _task_id;

  UPDATE public.requests SET task_id = _task_id WHERE id = NEW.id;

  INSERT INTO public.task_activity_log (task_id, user_id, action, details)
  VALUES (_task_id, NEW.created_by_user_id, 'created', 'Created from request: ' || NEW.topic);

  RETURN NEW;
END;
$function$;
