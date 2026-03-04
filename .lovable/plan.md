

# Sync All Requests to Workflow Idea Board

## Problem
When clients create requests from the Requests page, **no post is created** — so the team never sees it on their Workflow board. Only the `MakeRequestDialog` (Think Tank/Projects/Tasks) manually inserts a post, but this is fragile and duplicates logic. Additionally, clients **cannot insert into the `posts` table** due to RLS (`is_ss_role()` only for INSERT), so client-created requests never appear in the workflow.

## Solution
Use a **database trigger** on the `requests` table that automatically creates a post in `idea` status whenever a request is inserted. This ensures every request — regardless of origin (client, admin, MakeRequestDialog) — immediately populates the Workflow Idea board and notifies the team.

## Changes

### 1. Database Migration — New Trigger
Create `auto_create_post_from_request()` trigger function (SECURITY DEFINER) on `requests` AFTER INSERT:
- Inserts a post with `client_id`, `title = NEW.topic`, `caption = NEW.notes`, `status_column = 'idea'`, `created_by_user_id = NEW.created_by_user_id`
- Notifies all SS role users (ss_admin, ss_producer, ss_ops) with a notification: "New request: [topic]"

### 2. Remove Duplicate Post Creation from `MakeRequestDialog.tsx`
Remove the manual `supabase.from("posts").insert(...)` call (lines 70-78) since the trigger now handles it automatically.

### 3. Invalidate Workflow Queries in `Requests.tsx`
After a request is created on the Requests page, also invalidate `workflow-posts` query key so the Workflow board updates if open.

### 4. Invalidate Workflow Queries in `MakeRequestDialog.tsx`
Same — invalidate `workflow-posts` on success.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `auto_create_post_from_request` trigger on `requests` table |
| `src/components/MakeRequestDialog.tsx` | Remove manual post insert (trigger handles it); invalidate `workflow-posts` |
| `src/pages/Requests.tsx` | Invalidate `workflow-posts` on request creation success |

