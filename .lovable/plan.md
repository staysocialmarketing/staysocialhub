

# Fix Foreign Key Violations on Task & Project Deletion

## Problem
Deleting a task fails because child records in `task_activity_log`, `task_attachments`, `task_checklist_items`, and `comments` reference the task. Similarly, deleting a project fails because `tasks` reference it via `project_id`. The `requests` table also has a `task_id` column that references tasks.

## Changes

### File: `src/components/TaskDetailDialog.tsx` (line ~184-189)

Replace the simple delete with a cascading delete that removes child records first:

```typescript
const handleDelete = async () => {
  if (!task) return;
  // Delete child records first
  await supabase.from("task_checklist_items").delete().eq("task_id", task.id);
  await supabase.from("task_attachments").delete().eq("task_id", task.id);
  await supabase.from("task_activity_log").delete().eq("task_id", task.id);
  await supabase.from("comments").delete().eq("task_id", task.id);
  // Unlink from requests
  await supabase.from("requests").update({ task_id: null }).eq("task_id", task.id);
  // Delete the task
  const { error } = await supabase.from("tasks").delete().eq("id", task.id);
  if (error) { toast.error(error.message); return; }
  toast.success("Task deleted");
  onUpdated();
  onClose();
};
```

### File: `src/pages/team/Projects.tsx` (line ~201-207)

Replace the simple project delete with cascading logic -- unlink tasks from the project before deleting:

```typescript
const handleDeleteProject = async () => {
  if (!editProject) return;
  // Unlink tasks from this project
  await supabase.from("tasks").update({ project_id: null }).eq("project_id", editProject.id);
  // Unlink think tank items
  await supabase.from("think_tank_items").update({ project_id: null }).eq("project_id", editProject.id);
  // Delete the project
  const { error } = await supabase.from("projects").delete().eq("id", editProject.id);
  if (error) { toast.error(error.message); return; }
  toast.success("Project deleted");
  setEditProject(null);
  fetchProjects();
};
```

Note: `task_activity_log` has no DELETE RLS policy, so we need a migration to add one for SS roles.

### Database Migration

Add DELETE policy on `task_activity_log` for SS roles:

```sql
CREATE POLICY "SS can delete task activity"
ON public.task_activity_log
FOR DELETE
TO authenticated
USING (is_ss_role());
```

