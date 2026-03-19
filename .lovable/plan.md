

# Smart FAB + Client Dashboard Capture Widget

## Overview
Two changes: (1) Replace the current GlobalCaptureButton's form-heavy dialog with the Pressmaster-style Capture UI, and (2) add a capture widget to the client dashboard. This sets the foundation for the DIY client layer.

## What Changes

### 1. Smart FAB — `src/components/GlobalCaptureButton.tsx`

Replace the current multi-step form dialog with a clean sheet/drawer that mirrors the CaptureTab design:

**For SS roles (internal team):**
- Opens a bottom sheet (mobile) or dialog (desktop)
- Shows the same action grid: Pin a Thought, Record Voice, Add Link, Upload File, Create Task, Create Request
- Submit saves to `brain_captures` if a client is selected, or to `tasks`/`think_tank_items` as before
- Adds a client selector at the top since we're outside Brain context
- Keeps existing task/request creation but wraps them in the cleaner visual style

**For client roles:**
- Opens the same clean sheet
- Shows: Pin a Thought, Record Voice, Upload File, Make a Request
- Captures save to `brain_captures` scoped to their `client_id`
- This is new — clients can now capture ideas directly

**RLS update required**: Add a policy allowing clients to insert/select their own `brain_captures` rows (currently SS-only).

### 2. Client Dashboard Capture Widget — `src/pages/Dashboard.tsx`

In the `ClientDashboard` component, add a capture section between the greeting and Quick Actions:

- Greeting stays: "Welcome back, [Name]"
- New section below: "What's on your mind?" with the same minimal input + action buttons from CaptureTab
- Inline — not a separate component, but imports/reuses the capture logic
- Shows last 3 captures as small preview cards below
- Tapping a card expands inline or navigates to a future "My Ideas" page

### 3. Database — Migration

```sql
-- Allow clients to insert and view their own brain_captures
CREATE POLICY "Clients can insert own captures"
  ON public.brain_captures FOR INSERT TO authenticated
  WITH CHECK (client_id = (SELECT client_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Clients can view own captures"
  ON public.brain_captures FOR SELECT TO authenticated
  USING (client_id = (SELECT client_id FROM public.users WHERE id = auth.uid()));
```

## Files Changed

| File | Change |
|------|--------|
| Migration | Add client RLS policies for `brain_captures` |
| `src/components/GlobalCaptureButton.tsx` | Rewrite dialog to Pressmaster-style sheet with action grid |
| `src/pages/Dashboard.tsx` | Add capture widget to `ClientDashboard` |
| `src/components/brain/CaptureTab.tsx` | Extract reusable capture logic into shared hooks/utils if needed |

## What stays the same
- Brain > Capture tab — untouched
- Brand Twin — untouched
- All existing SS capture functionality (tasks, requests, ideas) — preserved, just restyled
- Workflow, approvals, requests — no changes

## Architecture Note
This creates the three-layer foundation:
1. **Internal team**: Full Brain + Capture + FAB with client selector
2. **Managed clients**: Dashboard widget + FAB for quick captures + approval workflows
3. **DIY clients** (future): Enhanced capture with AI suggestions, templates, guided prompts — builds on this same `brain_captures` table and UI patterns

