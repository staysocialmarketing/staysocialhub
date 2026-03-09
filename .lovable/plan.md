

# Hub Operations Cleanup + Version Display + Workflow Permissions

## 1. Remove Duplicate Version Display from Sidebar

**File:** `src/components/AppSidebar.tsx`
- Remove `versionLabel` state, the `useEffect` that fetches it (lines 124-141), and the version button in the footer (lines 271-284)
- Remove `VersionHistoryDialog` import and usage (line 43, 295)
- Keep the header version in `AppLayout.tsx` as the single source of truth (already works correctly with click behavior)

## 2. Workflow Structure Lock — Add `ready_to_schedule` Status

**Database Migration:** Add new enum value to `post_status`
```sql
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ready_to_schedule';
```

**File:** `src/lib/workflowUtils.ts`
- Update `getApproveTarget` so client_approval for social → `ready_to_schedule` instead of `scheduled`

**File:** `src/pages/Workflow.tsx`
- No column changes needed — workflow board shows idea/in_progress/internal_review. The downstream statuses (ready_to_schedule, scheduled, etc.) are managed via the Approvals page.

**File:** `src/pages/Approvals.tsx`
- Add a "Ready to Schedule" section in AdminApprovals (between Client Approval and Scheduled sections)
- Include `ready_to_schedule` in the query's status filter

## 3. Approval Actions for Client Approval Cards

**File:** `src/pages/Approvals.tsx`
- Add `ApprovalActions` to client_approval cards in AdminApprovals (currently only internal_review has them)
- In ClientApprovals, approval actions already show for `client_approval` when `canApprove` is true — no change needed

**File:** `src/pages/Workflow.tsx`  
- Workflow board only shows up to internal_review, so no changes needed for client_approval hover actions there

## 4. Permissions Enforcement — Route Guards

**File:** `src/App.tsx`
- Add `SSAdminRoute` guard for admin-only pages: `/admin/users`, `/admin/versions`
- Keep `AdminRoute` (isSSRole check) for team-accessible admin pages: `/admin/clients`, `/admin/marketplace`, `/admin/media`, `/admin/team/*`

**File:** `src/components/AppSidebar.tsx`
- Already filters "Users" and "Versions" from sidebar for non-admin SS team (line 144-146) — confirmed correct

## 5. Header Version Click Behavior

Already implemented correctly in `AppLayout.tsx`:
- SS roles → opens VersionHistoryDialog
- Clients → navigates to `/whats-new#release-notes`
- Visibility filtering by `visible_to_clients` already in place

No changes needed.

## Summary of Files

| Action | File | Change |
|--------|------|--------|
| Migration | post_status enum | Add `ready_to_schedule` value |
| Edit | `src/components/AppSidebar.tsx` | Remove duplicate version display |
| Edit | `src/lib/workflowUtils.ts` | Social approve target: `ready_to_schedule` |
| Edit | `src/pages/Approvals.tsx` | Add Ready to Schedule section + approval actions on client_approval cards |
| Edit | `src/App.tsx` | Add SSAdminRoute for Users + Versions pages |

