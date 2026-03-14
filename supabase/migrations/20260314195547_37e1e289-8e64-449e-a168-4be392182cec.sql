-- Add new enum values
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ai_draft';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ready_for_client_batch';

-- Update the client activity trigger to handle new statuses
CREATE OR REPLACE FUNCTION public.log_client_activity_on_post_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _type text;
  _title text;
  _visible boolean := true;
BEGIN
  IF OLD.status_column IS NOT DISTINCT FROM NEW.status_column THEN
    RETURN NEW;
  END IF;

  CASE NEW.status_column::text
    WHEN 'ai_draft' THEN _type := 'ai_draft_generated'; _title := NEW.title || ' AI draft generated'; _visible := false;
    WHEN 'internal_review' THEN _type := 'internal_review_completed'; _title := NEW.title || ' moved to internal review'; _visible := false;
    WHEN 'corey_review' THEN _type := 'corey_review'; _title := NEW.title || ' moved to Corey review'; _visible := false;
    WHEN 'ready_for_client_batch' THEN _type := 'batch_ready'; _title := NEW.title || ' approved internally'; _visible := false;
    WHEN 'client_approval' THEN _type := 'approval_completed'; _title := NEW.title || ' is ready for your approval'; _visible := true;
    WHEN 'scheduled' THEN _type := 'content_scheduled'; _title := NEW.title || ' has been scheduled'; _visible := true;
    WHEN 'ready_to_schedule' THEN _type := 'content_scheduled'; _title := NEW.title || ' is ready to schedule'; _visible := false;
    WHEN 'published' THEN _type := 'content_published'; _title := NEW.title || ' has been published'; _visible := true;
    WHEN 'sent' THEN _type := 'email_sent'; _title := NEW.title || ' has been sent'; _visible := true;
    WHEN 'in_progress' THEN _type := 'request_status_changed'; _title := NEW.title || ' moved to in progress'; _visible := false;
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO public.client_activity (client_id, activity_type, title, visible_to_client, created_by_user_id)
  VALUES (NEW.client_id, _type, _title, _visible, auth.uid());

  RETURN NEW;
END;
$function$;