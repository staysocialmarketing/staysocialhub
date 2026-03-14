

# Approval Batches System

## Database Changes (Migration)

### New table: `approval_batches`

| Column | Type | Default |
|--------|------|---------|
| `id` | uuid PK | `gen_random_uuid()` |
| `client_id` | uuid NOT NULL | FK to clients |
| `name` | text NOT NULL | — |
| `batch_type` | text NOT NULL | `'custom'` |
| `status` | text NOT NULL | `'draft'` |
| `created_by_user_id` | uuid NOT NULL | — |
| `sent_at` | timestamptz | NULL |
| `created_at` / `updated_at` | timestamptz | `now()` |

RLS: SS roles full access; clients can SELECT where `is_client_member(client_id)`.

### New table: `approval_batch_items`

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `batch_id` | uuid NOT NULL FK |
| `post_id` | uuid NOT NULL FK |
| `created_at` | timestamptz |

Unique constraint on `(batch_id, post_id)`. RLS: SS roles full access; clients can SELECT via batch's client_id.

## Code Changes

### `src/pages/Approvals.tsx` — Replace "Ready for Client Batch" section

The current section shows individual cards with "Release to Client" buttons. Replace with a batch-aware UI:

**Unbatched items subsection**: Posts in `ready_for_client_batch` that are NOT in any `approval_batch_items` row. Each card gets a checkbox for multi-select. An "Add to Batch" button opens a dialog to either create a new batch or add to an existing draft batch for that client.

**Batches subsection**: Query `approval_batches` with status in `('draft', 'ready_for_client_batch', 'sent_to_client', 'partially_approved', 'approved', 'needs_changes', 'scheduled', 'completed')`. Group by client. Each batch card shows:
- Batch name, type badge, item count, status badge, sent date
- Expand to see items inside
- Actions: "Send to Client" (draft batches), "Resend Reminder" (sent batches), "Hold" toggle
- Edit: add/remove items dialog

**Send to Client action**:
1. Update all batch item posts: `status_column = 'client_approval'`
2. Update batch: `status = 'sent_to_client'`, `sent_at = now()`
3. Call existing `notify_batch_sent_to_client` RPC with batch name, client_id, item count

**Create Batch dialog**:
- Client selector (auto-set if only one client's items selected)
- Batch name input (auto-suggest: `{client} – Week {n} Content`)
- Batch type: weekly / monthly / custom
- Multi-select unbatched posts for that client

### Batch status derivation (on frontend)

After a batch is sent, individual post statuses drive the batch display status:
- All posts approved/scheduled/published → `approved`/`scheduled`/`completed`
- Any post has changes requested → `needs_changes`
- Mix → `partially_approved`

This is computed at render time from joined post statuses, not stored (keeps it simple and always accurate).

## Files

| File | Change |
|------|--------|
| Migration SQL | Create `approval_batches` + `approval_batch_items` with RLS |
| `src/pages/Approvals.tsx` | Replace "Ready for Client Batch" section with batch management UI (unbatched items, batch cards, create/edit/send dialogs) |

