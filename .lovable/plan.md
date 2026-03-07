

# Email Campaign Workflow Update

## Overview

Add content-type-aware workflow branching so that after Client Approval, different work types follow different final stages. Add email-specific fields to the posts table.

## Database Migration

### 1. Add new post_status enum values
- `ready_to_send` — email campaigns awaiting send
- `sent` — email campaigns that have been sent
- `complete` — for other work types (ad creative, landing pages, etc.)

### 2. Add email-specific columns to posts table
- `subject_line` (text, nullable)
- `preview_text` (text, nullable)
- `email_body` (text, nullable)
- `audience` (text, nullable) — e.g. "Client Database", "Realtor Partners", etc.
- `send_date` (timestamptz, nullable)
- `campaign_link` (text, nullable)

### 3. Add new content_type values
The `content_type` column is a plain text field (not an enum), so no migration needed — just use new values in the UI: `email_campaign`, `ad_creative`, `landing_page`, `graphic_design`, `website_update`, `general_task`.

## Workflow Branching Logic

The shared kanban columns remain: **New, In Progress, Internal Review, Client Approval**

After Client Approval, the board shows type-specific final sections:

| Content Type | Post-Approval Flow |
|---|---|
| Social (image, video, reel, carousel) | Scheduled → Published |
| Email Campaign | Ready to Send → Scheduled → Sent |
| Other (ad_creative, landing_page, etc.) | Complete |

## File Changes

### `src/pages/Workflow.tsx`
- Update `CONTENT_TYPES` filter to include email_campaign and other types
- Keep 4 shared kanban columns (New, In Progress, Internal Review, Client Approval)
- Bottom sections become dynamic based on content type filter:
  - "all" or social types: show Scheduled + Published
  - email_campaign: show Ready to Send + Scheduled + Sent
  - other types: show Complete
- Update the "New Post" dialog to show content type selector; when `email_campaign` is selected, show email-specific fields (subject line, preview text, email body, audience) instead of caption/hashtags/platform
- Add "Send Now" and "Schedule" action buttons on cards in `ready_to_send` status

### `src/components/WorkflowCardDialog.tsx`
- In read-only and edit modes, show email-specific fields when content_type is `email_campaign`
- Add send_date and campaign_link fields
- Show "Send Now" / "Schedule" actions when status is `ready_to_send`

### `src/components/ApprovalActions.tsx`
- Update `approveTarget` logic: when approving from `client_approval`, determine target based on content type:
  - Social → `scheduled`
  - Email → `ready_to_send`
  - Other → `complete`

### `src/pages/Approvals.tsx`
- Client view: add "Sent Campaigns" section showing posts with `content_type = 'email_campaign'` and `status_column = 'sent'`
- Admin view: show Ready to Send section for email campaigns

### `src/pages/Dashboard.tsx`
- Client dashboard: add "Sent Campaigns" stat card counting sent email campaigns
- Show sent campaigns in the content history

### `src/components/RequestChangesModal.tsx`
No changes needed — works the same for all content types.

## Content Type Awareness in ApprovalActions

The `ApprovalActions` component currently receives a hardcoded `approveTarget`. This needs to change so the approve target is determined by the post's content type:

- Workflow.tsx and Approvals.tsx will pass `contentType` to `ApprovalActions`
- ApprovalActions will compute the correct target internally based on the content type and current status

## Summary

| File | Change |
|------|--------|
| Migration SQL | Add `ready_to_send`, `sent`, `complete` to post_status enum; add email columns to posts |
| `src/pages/Workflow.tsx` | Content-type-aware branching, email fields in create dialog, Send Now/Schedule actions |
| `src/components/WorkflowCardDialog.tsx` | Email-specific fields in read/edit views, send actions |
| `src/components/ApprovalActions.tsx` | Content-type-aware approve targets |
| `src/pages/Approvals.tsx` | Sent Campaigns section for clients |
| `src/pages/Dashboard.tsx` | Sent Campaigns stat for client dashboard |

