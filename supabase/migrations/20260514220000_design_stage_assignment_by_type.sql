-- Fix: auto_reassign_on_status_change should only assign Gavin when design_type = 'gavin'.
-- Posts with design_type = 'auto' go to Higgsfield — no user assignment from this trigger.
-- All other stages are unaffected.

CREATE OR REPLACE FUNCTION public.auto_reassign_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _target_id uuid;
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    -- For the 'design' stage, only assign if design_type = 'gavin'.
    -- design_type = 'auto' routes to Higgsfield — skip user assignment.
    IF NEW.status_column = 'design' AND NEW.design_type IS DISTINCT FROM 'gavin' THEN
      RETURN NEW;
    END IF;

    SELECT assigned_user_id INTO _target_id
    FROM public.workflow_stage_assignments
    WHERE stage = NEW.status_column::text;

    IF _target_id IS NOT NULL THEN
      NEW.assigned_to_user_id := _target_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
