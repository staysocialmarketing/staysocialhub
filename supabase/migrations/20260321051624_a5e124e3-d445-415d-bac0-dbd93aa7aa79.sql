
-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL, -- request_created, post_status_changed, task_created, task_status_changed
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text NOT NULL, -- assign_user, notify_user, change_status, add_tag
  action_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- SS admin can manage
CREATE POLICY "SS admin can manage automation rules"
  ON public.automation_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'ss_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ss_admin'::app_role));

-- SS team can view
CREATE POLICY "SS can view automation rules"
  ON public.automation_rules FOR SELECT
  TO authenticated
  USING (is_ss_role());

-- Updated_at trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
