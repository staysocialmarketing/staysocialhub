-- Remove Gavin from the design stage auto-assignment.
-- Corey is managing design personally for now — posts moving to 'design'
-- should remain unassigned rather than routing to Gavin automatically.

-- 1. Clear the design stage row from the assignment table.
DELETE FROM public.workflow_stage_assignments WHERE stage = 'design';

-- 2. Update the trigger function: remove the design_type = 'gavin' special-case.
--    Design stage now always skips auto-assignment (stays unassigned).
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
    -- Design stage: skip auto-assignment entirely — Corey manages this manually.
    IF NEW.status_column = 'design' THEN
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
