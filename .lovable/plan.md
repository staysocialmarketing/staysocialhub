

# Task Detail Improvements — Plan

## Overview
Transform the task edit dialog into a full-featured task detail view with Comments, Attachments, Checklist, and Activity Log sections. Requires 3 new database tables and a new dedicated detail component.

## Database Migrations

### 1. `task_checklist_items` table
```sql
CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can manage task checklist items" ON public.task_checklist_items FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());
```

### 2. `task_attachments` table
```sql
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can manage task attachments" ON public.task_attachments FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());
```

### 3. `task_activity_log` table
```sql
CREATE TABLE public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SS can view task activity" ON public.task_activity_log FOR SELECT TO authenticated USING (is_ss_role());
CREATE POLICY "SS can insert task activity" ON public.task_activity_log FOR INSERT TO authenticated WITH CHECK (is_ss_role());
```

### 4. Comments — reuse existing `comments` table
The `comments` table already exists with `post_id` and `request_id` columns. Add a `task_id` column:
```sql
ALTER TABLE public.comments ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
```
Update the existing RLS insert/view policies to also allow access when the comment is linked to a task (via `is_ss_role()`).

### 5. Activity log trigger on tasks
```sql
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status || ' → ' || NEW.status);
  END IF;
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'reassigned', 'Assignee changed');
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO task_activity_log (task_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority || ' → ' || NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_task_changes BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_task_changes();
```

## New Component: `src/components/TaskDetailDialog.tsx`

A large dialog (`max-w-3xl`) replacing the current inline edit dialog. Uses Tabs to organize content:

**Header area**: Task title (editable inline), priority badge, status select, delete button.

**Sidebar-style fields** (left or top): Client, Project, Assignee, Due Date — same selectors as current edit dialog.

**Tabbed sections**:
1. **Description** — Textarea for rich instructions
2. **Checklist** — List of `task_checklist_items`. Add new item input, toggle complete, reorder, delete. Progress bar showing X/Y complete.
3. **Attachments** — Upload files to `creative-assets` bucket under `tasks/{task_id}/`. List with file name, download link, delete.
4. **Comments** — Thread of comments from `comments` table where `task_id` matches. Input to add new comment. Shows user name and timestamp.
5. **Activity** — Read-only log from `task_activity_log`. Shows action, user, timestamp.

## Files Changed

| File | Change |
|------|--------|
| `src/components/TaskDetailDialog.tsx` | **New** — Full task detail with tabs |
| `src/pages/team/Tasks.tsx` | Replace inline edit dialog with `<TaskDetailDialog>`, remove edit state management |

## Technical Notes
- Attachments upload to `creative-assets/tasks/{taskId}/{filename}` in the existing public bucket
- Comments reuse the existing `comments` table with new `task_id` FK
- Activity log is auto-populated by a DB trigger — no manual inserts needed from the UI for status/assignee/priority changes
- Checklist items support toggle and inline add/delete
- The comments RLS policies need updating to include `task_id IS NOT NULL AND is_ss_role()` conditions

