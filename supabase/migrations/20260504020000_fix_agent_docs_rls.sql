-- Fix: restrict agent_docs reads to SS roles only.
-- Original policy used auth.role() = 'authenticated' which gave every
-- signed-in client SELECT access to internal memory/tasks/decisions.
-- Align with the role-based checks used on all other workspace tables.

DROP POLICY IF EXISTS "agent_docs_authenticated_read" ON agent_docs;
CREATE POLICY "agent_docs_ss_read" ON agent_docs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ss_admin', 'ss_manager', 'ss_producer', 'ss_ops', 'ss_team')
    )
  );
