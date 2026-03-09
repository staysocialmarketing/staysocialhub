CREATE POLICY "SS can delete task activity"
ON public.task_activity_log
FOR DELETE
TO authenticated
USING (is_ss_role());