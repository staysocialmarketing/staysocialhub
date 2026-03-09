

# Client Activity Timeline Enhancement

## What Already Exists
- `client_activity` table with columns: id, client_id, activity_type, title, description, visible_to_client, created_by_user_id, created_at
- `ActivityTimeline` component rendering events chronologically
- `AddActivityDialog` for manual SS entries
- Timeline shown in SuccessCenter only

## What Needs to Change

### 1. Expand Event Types & Icons
**File:** `src/components/activity/ActivityTimeline.tsx`
- Add new event types to icon/label maps: `request_status_changed`, `internal_review_completed`, `client_changes_requested`, `task_completed`, `content_scheduled`, `content_published`, `email_scheduled`, `email_sent`
- Switch date display from "MMM d" to relative time using `formatDistanceToNow` from date-fns ("2 hours ago")

**File:** `src/components/activity/AddActivityDialog.tsx`
- Add matching new types to the ACTIVITY_TYPES list

### 2. Add "Load More" Pagination
**File:** `src/components/activity/ActivityTimeline.tsx`
- Accept `onLoadMore` and `hasMore` props
- Render a "Load More" button at the bottom when `hasMore` is true

**File:** `src/pages/client/SuccessCenter.tsx`
- Track `limit` state (start at 10), increment by 10 on load more
- Pass `hasMore` based on whether returned count equals limit

### 3. Add Timeline to Client Dashboard
**File:** `src/pages/Dashboard.tsx` (ClientDashboard section)
- Add a "Recent Activity" section after the stats cards
- Query `client_activity` table (limit 10, ordered by created_at desc)
- Render `ActivityTimeline` component with load more support

### 4. Auto-Log Events via Database Trigger
**Migration:** Create a trigger on `posts` table for status changes to auto-insert into `client_activity`

```sql
CREATE OR REPLACE FUNCTION public.log_client_activity_on_post_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _type text;
  _title text;
  _visible boolean := true;
BEGIN
  IF OLD.status_column IS NOT DISTINCT FROM NEW.status_column THEN
    RETURN NEW;
  END IF;

  CASE NEW.status_column::text
    WHEN 'internal_review' THEN _type := 'internal_review_completed'; _title := NEW.title || ' moved to internal review'; _visible := false;
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
$$;

CREATE TRIGGER trg_log_client_activity_on_post_status
  AFTER UPDATE OF status_column ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.log_client_activity_on_post_status();
```

### 5. Add Timeline to Admin Client Activity Dialog
**File:** `src/pages/admin/AdminClients.tsx`
- In the existing "Client Activity" dialog, add a new "Timeline" tab or section at the top showing `ActivityTimeline` entries from `client_activity` table for that client
- Include `AddActivityDialog` button

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Migration | trigger on posts | Auto-log status changes to client_activity |
| Edit | `src/components/activity/ActivityTimeline.tsx` | New event types, relative time, Load More support |
| Edit | `src/components/activity/AddActivityDialog.tsx` | Expanded type list |
| Edit | `src/pages/Dashboard.tsx` | Add timeline section to ClientDashboard |
| Edit | `src/pages/client/SuccessCenter.tsx` | Add Load More pagination |
| Edit | `src/pages/admin/AdminClients.tsx` | Add timeline to client activity dialog |

