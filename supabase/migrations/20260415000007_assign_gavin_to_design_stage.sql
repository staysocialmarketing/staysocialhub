-- Assign Gavin (ss_team) to the 'design' workflow stage.
-- The auto_reassign_on_status_change BEFORE trigger reads this table and sets
-- assigned_to_user_id automatically whenever a post moves to 'design'.
-- The notify_on_status_change AFTER trigger then notifies the assigned user,
-- so Gavin receives a notification automatically — no additional code needed.
INSERT INTO public.workflow_stage_assignments (stage, assigned_user_id)
VALUES ('design', '6d0174a4-110e-4867-897d-f89a3729f7d2')
ON CONFLICT (stage) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  updated_at = now();
