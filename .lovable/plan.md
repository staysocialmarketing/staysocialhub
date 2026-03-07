

# Stay Social HUB — Admin & Team System Update

## What's Already Done vs What's New

Most of the requested changes were implemented in the previous round. Here's what still needs work:

### Already Implemented (No Changes Needed)
- Role structure (ss_admin, ss_team, client_admin, client_assistant)
- Task statuses (6-column kanban: backlog/todo/in_progress/waiting/review/complete)
- Task filters (My Tasks, All Tasks, Unassigned)
- Marketplace renamed (Solutions → Plans, billing_type field, Convert to Upgrade)
- SS Team view-only marketplace restrictions
- Request assignment with Assigned User, Status, Priority display
- Media library type filters + Download/Copy Link
- Workflow stage handoff preferences table

### New Work Required

#### 1. Work Queue Dashboard (Major — rewrites `Dashboard.tsx`)
Transform both SuperAdminDashboard and TeamDashboard into a unified Work Queue with:

**Sections (in order):**
- **Stats row**: My Tasks count, My Requests count, Approvals Waiting count, Overdue count
- **My Tasks**: Tasks assigned to logged-in user with columns: Task Name, Client, Project, Due Date, Priority, Status
- **My Requests**: Requests assigned to logged-in user with: Request Title, Client, Requested By, Date, Priority
- **Approvals Waiting**: Posts in `client_approval` status with: Client, Content Type, Submission Date, Status
- **Overdue Work**: Tasks and posts past due date, visually highlighted (red/destructive styling)

**Dashboard filter tabs**: My Work | Team Work | All Work (admin only)

**Quick actions per item**: Open, Change Status, Mark Complete, Assign User — implemented as inline dropdowns and buttons on each row.

**"View All" links** on each section header linking to the full page.

#### 2. Request → Task Auto-Creation (Database trigger)
Currently requests create posts via `auto_create_post_from_request`. Add a new trigger to also create a task in the `tasks` table when a request is submitted:
```sql
CREATE FUNCTION auto_create_task_from_request() ...
-- Inserts into tasks table with title=request.topic, client_id, status='todo'
```

#### 3. Navigation Reorder (`AppSidebar.tsx`)
Flatten to single nav list for admin/team (remove Team/Admin section dividers):

**Admin**: Dashboard, Workflow, Approvals, Clients, Requests, Projects, Tasks, Think Tank, Media Library, Marketplace, Users

**Team**: Same minus Users

This matches the user's requested order while keeping Workflow and Approvals (which are core production views).

#### 4. Users Page — Multi-Client (Deferred)
The user requests multi-client assignment again. This requires a junction table and rewriting all RLS functions (`is_client_member`, `get_my_client_id`, `can_access_client`). **Recommendation: defer to V2** as noted previously — it's high-risk and the current single-client model works.

## Files to Change

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Complete rewrite of SuperAdmin and Team dashboards into Work Queue with filter tabs, quick actions, overdue highlighting |
| `src/components/AppSidebar.tsx` | Flatten nav into single ordered list, remove Team/Admin section dividers |
| **Migration SQL** | Add `auto_create_task_from_request` trigger so requests automatically create tasks |

## Technical Details

### Work Queue Dashboard Data Queries
- **My Tasks**: `tasks` table filtered by `assigned_to_user_id = profile.id` or `assigned_to_team = true`, exclude `complete`
- **My Requests**: `requests` table filtered by `assigned_to_user_id = profile.id` 
- **Approvals Waiting**: `posts` where `status_column = 'client_approval'`
- **Overdue**: Union of tasks with `due_at < now()` and status != complete, plus posts with `due_at < now()` and status != published
- **Filter tabs**: "My Work" = user's items only, "Team Work" = all SS team items, "All Work" = everything (admin only)

### Quick Actions Implementation
Each dashboard row gets an inline action bar (visible on hover or always on mobile):
- **Open**: Navigate to task/request/post detail
- **Change Status**: Inline `<Select>` dropdown
- **Mark Complete**: One-click button that sets status to `complete`/`completed`/`published`
- **Assign User**: Inline `<Select>` with SS users list

### Request → Task Trigger
```sql
CREATE FUNCTION public.auto_create_task_from_request()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.tasks (title, client_id, status, priority, created_by_user_id)
  VALUES (NEW.topic, NEW.client_id, 'todo', COALESCE(NEW.priority, 'normal'), NEW.created_by_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_request_create_task
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION auto_create_task_from_request();
```

