

# Corey Review Layer

## Summary
Add `corey_review` to the `post_status` enum and wire it into the workflow as a stage between Internal Review and Client Approval. Admin (Corey) can approve, request changes, or leave strategic comments. Team can view but not act. Clients never see this stage.

## Database Changes

### Migration
```sql
-- Add corey_review to post_status enum
ALTER TYPE public.post_status ADD VALUE 'corey_review' AFTER 'internal_review';
```

### Update notification trigger
Update `notify_on_status_change()` to handle the new `corey_review` status — notify all `ss_admin` users when a post enters this stage, and add a `log_client_activity_on_post_status()` entry (internal only, not visible to clients).

```sql
CREATE OR REPLACE FUNCTION public.notify_on_status_change() ...
  -- Add block: when status = 'corey_review', notify all ss_admin users
  IF NEW.status_column = 'corey_review' THEN
    FOR _admin_user IN
      SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'ss_admin'
    LOOP
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (_admin_user.user_id, 'Ready for Corey Review',
        NEW.title || ' is ready for your review', '/approvals');
    END LOOP;
  END IF;
```

Update `log_client_activity_on_post_status()` to add a case for `corey_review` with `_visible := false`.

## Frontend Changes

### `src/lib/workflowUtils.ts`
Update `getApproveTarget`:
- `internal_review` → `corey_review` (instead of `client_approval`)
- Add new case: `corey_review` → `client_approval`

### `src/pages/Workflow.tsx`
- No change to `PRIMARY_COLUMNS` — Corey Review is not a production column (it's an approval checkpoint)
- The workflow board query already fetches only `idea`, `in_progress`, `internal_review` statuses, so no change needed

### `src/pages/Approvals.tsx` — AdminApprovals
- Add `corey_review` to the query's `in()` filter
- Add a new "Awaiting Corey Review" section between Internal Review and Client Approval
- Filter: `posts.filter(p => p.status_column === "corey_review")`
- Show `ApprovalActions` only for `isSSAdmin` on `corey_review` cards
- Add a "Strategic Comment" button (comment-only, no status change) for admin on corey_review cards
- Add a `Badge` with "Corey Review" on cards in this status

### `src/pages/Approvals.tsx` — ClientApprovals
- No changes — clients already only query `client_approval` and later statuses, so `corey_review` is invisible to them

### `src/components/ApprovalActions.tsx`
- Update to handle `corey_review` status: approve moves to `client_approval` (already handled by updated `getApproveTarget`), request changes moves to `in_progress`
- Add a "Strategic Comment" button (visible only when `currentStatus === "corey_review"` and user is admin): inserts a comment without changing status

### `src/components/WorkflowCardDialog.tsx`
- Add "Corey Review" badge display when post status is `corey_review`

## Files

| Action | File | Change |
|--------|------|--------|
| Migration | `post_status` enum | Add `corey_review` value |
| Migration | Trigger functions | Update notification + activity log triggers |
| Edit | `src/lib/workflowUtils.ts` | Route `internal_review` → `corey_review`, add `corey_review` → `client_approval` |
| Edit | `src/pages/Approvals.tsx` | Add Corey Review section in admin view with approval actions |
| Edit | `src/components/ApprovalActions.tsx` | Add strategic comment button for corey_review |

