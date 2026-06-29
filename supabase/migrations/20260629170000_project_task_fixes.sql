-- Migration: Project & Task system fixes
-- Date: 2026-06-29
--
-- 1. Make task_activity_log.user_id nullable (fixes update-task-status bug —
--    agent actions don't have a user context)
-- 2. Add due_at column to projects table for project deadlines
-- 3. Add blocked_by column to tasks table for task dependency chaining

-- 1. Fix task_activity_log not-null constraint on user_id
ALTER TABLE task_activity_log ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add due_at to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_at timestamptz;

-- 3. Add blocked_by to tasks (references another task for dependency chaining)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES tasks(id);
