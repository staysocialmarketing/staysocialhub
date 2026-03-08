

# Simplify Workflow for Team/Admin + Full Editability

## Summary

Three changes: (1) Remove Approvals from team/admin sidebar nav — keep it only for clients, (2) Make all workflow cards clickable and fully editable for both admin AND team roles, (3) Make the linked request fields editable and allow content type evolution (e.g. post → campaign → email).

## 1. Remove Approvals from Team/Admin Nav

In `AppSidebar.tsx`, remove `{ title: "Approvals", url: "/approvals", icon: CheckSquare }` from `menuSection` (line 57). Approvals page stays in the router for clients and direct links, but team/admin use Workflow as their primary view.

The approval actions (Approve / Request Changes) remain on workflow cards in `internal_review` status — no functionality lost.

## 2. Make Workflow Cards Editable for All SS Roles

Currently `WorkflowCardDialog` only shows the Edit button for `isSSAdmin`. Change line 365-367 to show Edit for all `isSSRole` users (admin, producer, ops, team).

**File**: `src/components/WorkflowCardDialog.tsx`
- Import `isSSRole` from `useAuth()` (line 31)
- Change `{isSSAdmin && (` to `{isSSRole && (` on the Edit button (line 365)

## 3. Make Linked Request Editable + Allow Content Type Evolution

Currently the linked request section in `WorkflowCardDialog` is read-only. Add edit capability:

**In edit mode**, add these fields:
- **Platform(s)** — checkbox group (currently only editable on create)
- **Hashtags** — text input
- **Internal Notes** — textarea
- **Status override** — select dropdown showing all valid statuses so you can manually move a post to any stage

**For the linked request** (when `post.request_id` exists), show editable fields in edit mode:
- Request type (social_post, email_campaign, ad, etc.) — select
- Request priority — select  
- Request status — select (open, in_progress, complete)

This allows evolving a post: change content_type from `image` to `email_campaign` and the dialog dynamically switches to show email fields. The request type can be updated to match.

**Mutation changes**: Update `updatePost` mutation to also save `platform`, `hashtags`, `internal_notes`. Add a separate mutation to update the linked request's `type`, `priority`, `status`.

## 4. Add Platform, Hashtags, Internal Notes to Edit Mode

Currently edit mode is missing platform checkboxes, hashtags input, and internal notes. Add them between the caption/email fields and the due date field, matching the create dialog's structure.

## Files

| Action | File |
|--------|------|
| Edit | `src/components/AppSidebar.tsx` — remove Approvals from menuSection |
| Edit | `src/components/WorkflowCardDialog.tsx` — allow all SS roles to edit, add missing fields (platform, hashtags, internal notes, status), make linked request editable, support content type evolution |

No database changes needed.

