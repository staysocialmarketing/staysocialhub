
CREATE OR REPLACE FUNCTION public.auto_create_task_from_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tasks (title, client_id, status, priority, created_by_user_id)
  VALUES (NEW.topic, NEW.client_id, 'todo', COALESCE(NEW.priority, 'normal'), NEW.created_by_user_id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_request_create_task
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.auto_create_task_from_request();
