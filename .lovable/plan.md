
# Client Activity Timeline Enhancement

## Summary
Add an Activity Timeline section to the Success Center that displays recent client-specific work activity. Create new `client_activity` table for storing manual and automated activity entries. Admin/team can create manual entries and, optionally, automate activity creation for key events.

## Database Changes

### New Table: `client_activity`
```sql
CREATE TABLE public.client_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id),
  visible_to_client boolean NOT NULL DEFAULT true
);

-- Indices
CREATE INDEX idx_client_activity_client_id ON public.client_activity(client_id);
CREATE INDEX idx_client_activity_created_at ON public.client_activity(created_at DESC);

-- RLS policies
ALTER TABLE public.client_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view visible activities"
  ON public.client_activity FOR SELECT
  USING (visible_to_client = true AND can_access_client(client_id));

CREATE POLICY "SS can manage all activities"
  ON public.client_activity FOR ALL
  USING (is_ss_role())
  WITH CHECK (is_ss_role());
```

### Activity Types
- `manual_note`
- `request_created`
- `approval_completed`
- `media_uploaded`
- `campaign_launched`
- `post_published`
- `email_sent`

## Frontend Changes

### 1. New Component: `ActivityTimeline.tsx`
Create `src/components/activity/ActivityTimeline.tsx` to render the timeline with:
- Vertical timeline layout using cards
- Date formatting with `date-fns`
- Icon mapping based on `activity_type`
- Limit to 10 most recent items
- Empty state for no activities

Icon mapping:
- `manual_note` → MessageSquarePlus
- `request_created` → MessageSquarePlus
- `approval_completed` → CheckSquare
- `media_uploaded` → FolderOpen
- `campaign_launched` → Megaphone
- `post_published` → CheckSquare
- `email_sent` → MessageSquarePlus

### 2. Update `SuccessCenter.tsx`
- Add new query to fetch `client_activity` for the client
- Insert `<ActivityTimeline />` component after "Recent Wins" section (between sections 5 and 6)
- Pass activity data to component

### 3. New Admin Component: `AddActivityDialog.tsx`
Create a simple dialog accessible from Admin → Clients or inline on Success Center for admin:
- Form fields: Title (text), Description (textarea), Activity Type (select), Visible to Client (checkbox)
- On submit: insert into `client_activity` with current client_id
- Trigger: "Add Activity" button visible only to `isSSRole`

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `client_activity` table | Create table with RLS policies |
| Create | `src/components/activity/ActivityTimeline.tsx` | Timeline display component with icon mapping |
| Create | `src/components/activity/AddActivityDialog.tsx` | Admin form for manual activity entries |
| Edit | `src/pages/client/SuccessCenter.tsx` | Add activity query + ActivityTimeline after Recent Wins section |

## Optional: Auto Activity Hooks
If requested, add triggers in existing workflows to auto-create activity entries:
- When request created → insert `request_created` activity
- When approval completed → insert `approval_completed` activity
- When media uploaded → insert `media_uploaded` activity

These can be implemented as database triggers or client-side inserts after successful mutations. Keep initial implementation simple — manual entries only.

## UI Details
- Timeline cards show date on left, icon + title/description on right
- Use `format(new Date(created_at), 'MMM d')` for date display
- Keep consistent with Hub card styling (border, shadow, spacing)
- Empty state: "No recent activity yet."
