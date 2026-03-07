
-- Migrate existing roles
UPDATE public.user_roles SET role = 'ss_team' WHERE role IN ('ss_producer', 'ss_ops');

-- Create workflow_stage_assignments table
CREATE TABLE IF NOT EXISTS public.workflow_stage_assignments (
  stage text PRIMARY KEY,
  assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.workflow_stage_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "SS can view workflow assignments" ON public.workflow_stage_assignments FOR SELECT USING (is_ss_role());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "SS admin can manage workflow assignments" ON public.workflow_stage_assignments FOR ALL USING (is_ss_role()) WITH CHECK (is_ss_role());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'monthly';
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_ss_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team')
  )
$$;

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

CREATE OR REPLACE FUNCTION public.auto_reassign_on_design()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_post_from_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ss_user record;
BEGIN
  INSERT INTO public.posts (client_id, title, caption, status_column, created_by_user_id, assigned_to_user_id, request_id)
  VALUES (NEW.client_id, NEW.topic, NEW.notes, 'idea', NEW.created_by_user_id, NULL, NEW.id);
  FOR _ss_user IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team')
      AND ur.user_id IS DISTINCT FROM NEW.created_by_user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_ss_user.user_id, 'New request', NEW.topic, '/requests');
  END LOOP;
  RETURN NEW;
END;
$function$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_stage_assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
