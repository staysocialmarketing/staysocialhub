
-- Add AI/agent metadata columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS raw_input_text text,
  ADD COLUMN IF NOT EXISTS raw_attachment_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text,
  ADD COLUMN IF NOT EXISTS agent_status text,
  ADD COLUMN IF NOT EXISTS agent_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_client text,
  ADD COLUMN IF NOT EXISTS ai_suggested_content_type text,
  ADD COLUMN IF NOT EXISTS ai_suggested_priority text,
  ADD COLUMN IF NOT EXISTS ai_suggested_assignee text,
  ADD COLUMN IF NOT EXISTS ai_suggested_project text,
  ADD COLUMN IF NOT EXISTS ai_suggested_subproject text,
  ADD COLUMN IF NOT EXISTS ai_suggested_next_action text,
  ADD COLUMN IF NOT EXISTS ai_suggested_item_type text,
  ADD COLUMN IF NOT EXISTS strategy_brief jsonb,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.requests(id),
  ADD COLUMN IF NOT EXISTS parent_item_id uuid;

-- Add AI/agent metadata columns to think_tank_items
ALTER TABLE public.think_tank_items
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS raw_input_text text,
  ADD COLUMN IF NOT EXISTS raw_attachment_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text,
  ADD COLUMN IF NOT EXISTS agent_status text,
  ADD COLUMN IF NOT EXISTS agent_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_client text,
  ADD COLUMN IF NOT EXISTS ai_suggested_content_type text,
  ADD COLUMN IF NOT EXISTS ai_suggested_priority text,
  ADD COLUMN IF NOT EXISTS ai_suggested_assignee text,
  ADD COLUMN IF NOT EXISTS ai_suggested_project text,
  ADD COLUMN IF NOT EXISTS ai_suggested_subproject text,
  ADD COLUMN IF NOT EXISTS ai_suggested_next_action text,
  ADD COLUMN IF NOT EXISTS strategy_brief jsonb;

-- Add AI/agent metadata columns to requests
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS raw_input_text text,
  ADD COLUMN IF NOT EXISTS raw_attachment_url text,
  ADD COLUMN IF NOT EXISTS voice_transcript text,
  ADD COLUMN IF NOT EXISTS agent_status text,
  ADD COLUMN IF NOT EXISTS agent_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_client text,
  ADD COLUMN IF NOT EXISTS ai_suggested_content_type text,
  ADD COLUMN IF NOT EXISTS ai_suggested_priority text,
  ADD COLUMN IF NOT EXISTS ai_suggested_assignee text,
  ADD COLUMN IF NOT EXISTS ai_suggested_project text,
  ADD COLUMN IF NOT EXISTS ai_suggested_subproject text,
  ADD COLUMN IF NOT EXISTS ai_suggested_next_action text,
  ADD COLUMN IF NOT EXISTS strategy_brief jsonb,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id);

-- Update the auto_create_task_from_request trigger to link request_id back
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

  -- Write the task_id back to the request
  UPDATE public.requests SET task_id = _task_id WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;
