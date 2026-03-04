

# Stay Social OS — Assignments, Due Dates & Notifications

## What's Already Built
- Role-based Kanban (team sees 9 columns, clients see 3) ✓
- Content Library ✓
- Calendar View ✓
- Internal notes, comments, version history ✓
- Admin views (clients, users, profile updates, add-on requests) ✓

## What's New

### 1. Assignments on Posts
Add two columns to `posts`:
- `assigned_to_user_id` (uuid, nullable) — the creator (e.g. Gavin)
- `reviewer_user_id` (uuid, nullable) — the reviewer (e.g. Tristan)

**UI changes:**
- **Create Post dialog** (`Approvals.tsx`): Add "Assign to" and "Reviewer" dropdowns (populated from SS-role users)
- **Kanban cards**: Show avatar initials for assigned user
- **PostDetail sidebar**: Show assigned/reviewer with ability for SS to change them
- **Dashboard (SS view)**: Add "My Assignments" section showing posts assigned to current user

### 2. Due Dates on Posts
Add `due_at` (timestamptz, nullable) to `posts`.

**UI changes:**
- **Create Post dialog**: Add "Due Date" picker
- **Kanban cards**: Show due date with color coding (red = overdue, orange = due today, grey = upcoming)
- **PostDetail sidebar**: Show/edit due date
- **Dashboard (SS view)**: "Overdue" and "Due Today" counters

### 3. In-App Notifications
New table `notifications`:
- `id`, `user_id`, `title`, `body`, `link`, `read`, `created_at`

RLS: users can only see/update their own notifications.

**Triggers (database functions):**
- When `posts.status_column` changes to `approved` or `request_changes` → notify the assigned user and reviewer
- When a comment is added → notify post owner + assigned user (excluding the commenter)

**UI changes:**
- **Bell icon in header** (`AppLayout.tsx`): Badge with unread count, dropdown showing recent notifications
- Click a notification → navigate to the linked post and mark as read

## Database Migration

```sql
-- Assignments
ALTER TABLE posts ADD COLUMN assigned_to_user_id uuid;
ALTER TABLE posts ADD COLUMN reviewer_user_id uuid;

-- Due dates
ALTER TABLE posts ADD COLUMN due_at timestamptz;

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Users see only their own
CREATE POLICY "View own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
-- System inserts via triggers (SECURITY DEFINER functions)

-- Trigger function: notify on status change
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    -- Notify assigned user
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.assigned_to_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
    -- Notify reviewer
    IF NEW.reviewer_user_id IS NOT NULL AND NEW.reviewer_user_id != NEW.assigned_to_user_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (NEW.reviewer_user_id,
        'Post status changed',
        NEW.title || ' moved to ' || replace(NEW.status_column::text, '_', ' '),
        '/approvals/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_status_notify
  AFTER UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_on_status_change();
```

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add columns + notifications table + triggers |
| `src/pages/Approvals.tsx` | Assignment dropdowns in create dialog, avatars + due date on cards |
| `src/pages/PostDetail.tsx` | Assignment & due date display/edit in sidebar |
| `src/pages/Dashboard.tsx` | "My Assignments" and overdue/due-today for SS roles |
| `src/components/AppLayout.tsx` | Notification bell in header with dropdown |
| `src/components/NotificationBell.tsx` | New component — bell icon, unread badge, popover list |

## Scope Note
This does NOT change any client-facing views — assignments, due dates, and notifications are team-facing features. Clients continue to see their simplified 3-column board.

