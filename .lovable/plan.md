

# Controlled Notification System

## Summary

Refactor the notification trigger to suppress per-item client notifications, add batch-aware client notifications, add role-aware team notifications with deduplication, and lay groundwork for optional email/digest.

## Database Changes

### 1. Create `notification_preferences` table

Stores per-user notification settings (in-app on/off, email on/off, daily digest on/off).

```sql
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  daily_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
-- Users can read/update their own; SS can read all
```

### 2. Add `notification_key` column to `notifications` table

A unique deduplication key to prevent duplicate alerts for the same workflow change.

```sql
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup ON public.notifications (notification_key) WHERE notification_key IS NOT NULL;
```

### 3. Update `notify_on_status_change()` trigger function

Key changes:
- **Remove client notification on `client_approval`** — clients no longer get per-item notifications when a post moves to `client_approval`
- **Add deduplication** — each insert uses `notification_key` (e.g., `post:{id}:status:{new_status}:user:{user_id}`) with `ON CONFLICT DO NOTHING`
- **Add overdue-aware fields** — no change needed here (overdue checks happen at query time)
- Keep team notifications for assigned user, reviewer, ss_admin on internal_review/corey_review

### 4. Create batch notification helper function

```sql
CREATE OR REPLACE FUNCTION public.notify_batch_sent_to_client(
  _batch_name text, _client_id uuid, _item_count int
) RETURNS void ...
```

This function:
- Inserts a single notification per `client_admin` user for that client
- Message: "Your next batch of content is ready for review in the Stay Social HUB."
- Uses `notification_key = 'batch_sent:{batch_name}:{client_id}'` for dedup
- Also notifies SS admins: "Batch '{name}' sent to client"

### 5. Create team notification functions

```sql
-- Called when client approves/requests changes on a batch
CREATE OR REPLACE FUNCTION public.notify_batch_client_response(
  _batch_name text, _client_id uuid, _action text -- 'approved' or 'changes_requested'
) RETURNS void ...
```

Notifies all SS admin/team users with dedup key.

## Code Changes

### `src/pages/Approvals.tsx`

When the "Release to Client" button is clicked (currently just updates `status_column`), also call `supabase.rpc('notify_batch_sent_to_client', ...)` to send the single batch notification. This replaces the per-item `client_approval` notification that the trigger currently fires.

*Note: The approval batches feature hasn't been built yet, so for now the ReleaseToClientButton will call this RPC directly. When batches are implemented, the batch send action will call this instead.*

### `src/components/NotificationBell.tsx`

No structural changes needed — it already renders all notifications. The dedup key prevents duplicates at the DB level.

### `src/pages/Profile.tsx`

Add a "Notification Preferences" section where users can toggle in-app notifications, email notifications, and daily digest. Query/upsert `notification_preferences` table.

## Deduplication Strategy

Every notification insert uses a deterministic `notification_key`:
- Post status change: `post:{postId}:to:{status}:for:{userId}`
- Batch sent: `batch:{batchName}:client:{clientId}:for:{userId}`
- Assignment: `assign:{postId}:to:{userId}`

The unique index with `ON CONFLICT DO NOTHING` prevents duplicates silently.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `notification_preferences`, add `notification_key` to `notifications`, update `notify_on_status_change`, create `notify_batch_sent_to_client` and `notify_batch_client_response` RPCs |
| `src/pages/Approvals.tsx` | ReleaseToClientButton calls batch notification RPC |
| `src/pages/Profile.tsx` | Add notification preferences UI section |

## What This Does NOT Do (Future)

- Email sending and daily digest processing require an edge function + cron job — the preferences table is created now, but actual email/digest delivery is deferred until email infrastructure is set up
- Approval Batches table creation (separate feature request already planned)

