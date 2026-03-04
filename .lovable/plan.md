

# Enhance Workflow: Editable Idea Cards, Content Types, Auto-Assignment & Design Handoff

## Current State
- Requests auto-create posts in "Idea" via DB trigger, but the trigger doesn't auto-assign anyone
- Posts have no "content type" field (Video/Image)
- Clicking a card navigates to `/approvals/:id` — no inline editing on the Workflow board
- Moving between columns has no auto-reassignment logic
- Tristan and Gavin are **not yet in the database** as users — they'll need to be added/invited before auto-assignment can reference them by ID

## Plan

### 1. Database Migration — Add `content_type` column + update trigger

**Add `content_type` to `posts`**: A text column (`'image'`, `'video'`, `'reel'`, `'carousel'`, or null) displayed as a badge on every card.

**Update `auto_create_post_from_request` trigger** to:
- Look up the `ss_producer` role user (Tristan) and auto-assign `assigned_to_user_id` to that user
- This ensures every request that lands in Idea is pre-assigned to Tristan

**Create `auto_reassign_on_design` trigger** on `posts` AFTER UPDATE:
- When `status_column` changes to `'design'`, look up the `ss_ops` role user (Gavin) and set `assigned_to_user_id` to that user
- This automates the handoff from Writing → Design

This approach uses **roles** (`ss_producer` = Tristan, `ss_ops` = Gavin) rather than hardcoded user IDs, so it works as long as those roles are assigned correctly.

### 2. Workflow Card — Inline Edit Dialog

Instead of navigating away to `/approvals/:id`, clicking a card in the Workflow board will open a **WorkflowCardDialog** (new component) that shows:
- Title (editable)
- Description/caption (editable)
- Due date (editable)
- Content type selector: Image, Video, Reel, Carousel
- Assigned to / Reviewer (editable)
- Client name (read-only)
- Platform badges
- Source indicator: "From Request" badge if the post originated from a request
- The original request details (if linked) — read-only view of the request topic, notes, type
- A "View Full Post" link to `/approvals/:id` for the full detail page

### 3. Link Posts to Requests

**Add `request_id` column to `posts`** (nullable FK to `requests.id`). The trigger will set this when creating a post from a request, enabling:
- Showing "From Request" badge on cards
- Viewing original request details in the card dialog

### 4. `movePost` Enhancement

Update the `movePost` mutation in `Workflow.tsx` to also update `assigned_to_user_id` when moving to Design (client-side), as a complement to the DB trigger (belt-and-suspenders approach).

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `content_type` text column to `posts`; add `request_id` uuid FK to `posts`; update `auto_create_post_from_request` to auto-assign ss_producer; create `auto_reassign_on_design` trigger |
| `src/components/WorkflowCardDialog.tsx` | New component: inline edit dialog for workflow cards with all editable fields |
| `src/pages/Workflow.tsx` | Open WorkflowCardDialog on card click instead of navigating; show content_type badge on cards; update movePost to include reassignment logic |

### Important Note
Tristan and Gavin must be registered users with `ss_producer` and `ss_ops` roles respectively for auto-assignment to work. If they haven't been invited yet, they'll need to be added via the Admin Users page first.

