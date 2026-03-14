

# Stabilize Core Workflow Logic

## Summary

Logic-only update. No UI redesign. Add two new `post_status` enum values, update workflow columns, update approval flow logic, and add a "Ready for Client Batch" gating stage.

## Database Migration

Add two new values to the `post_status` enum:

```sql
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ai_draft';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ready_for_client_batch';
```

Update `log_client_activity_on_post_status` trigger function to handle the new statuses (no client notification for `ready_for_client_batch`).

## Code Changes

### `src/pages/Workflow.tsx`

Update `PRIMARY_COLUMNS` to the new 5-column pipeline:

| Key | Label |
|-----|-------|
| `idea` | New |
| `ai_draft` | AI Draft Generated |
| `in_progress` | In Progress |
| `internal_review` | Internal Review |
| `corey_review` | Ready for Corey |

Update `ALL_STATUSES` to match. Remove ApprovalActions from workflow cards in `internal_review` column (approvals happen on the Approvals page).

### `src/pages/Approvals.tsx` (AdminApprovals)

Add `ready_for_client_batch` to the query filter. Add a new section "Ready for Client Batch" between Corey Review and Client Approval. This section shows a "Release to Client" button that moves the post to `client_approval` (which triggers the existing client notification). This is the gating mechanism that prevents automatic client notification.

### `src/lib/workflowUtils.ts`

Update `getApproveTarget`:
- `internal_review` approve → `corey_review` (unchanged)
- `corey_review` approve → `ready_for_client_batch` (changed from `client_approval`)
- `client_approval` approve → content-type branching (unchanged)

### `src/components/ApprovalActions.tsx`

No structural changes. The `getApproveTarget` update handles the new flow automatically.

### `src/components/WorkflowCardDialog.tsx`

No structural changes. Status dropdown already uses `Constants.public.Enums.post_status` which will include the new values after migration.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `ai_draft` and `ready_for_client_batch` to enum, update activity trigger |
| `src/pages/Workflow.tsx` | Update column definitions to 5 stages |
| `src/pages/Approvals.tsx` | Add "Ready for Client Batch" section with release button |
| `src/lib/workflowUtils.ts` | Update `getApproveTarget` for corey → batch |

