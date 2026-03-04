

# Phase 2 Implementation Plan

This is a large scope. To keep quality high, I recommend breaking it into **4 sub-phases** implemented sequentially. Here is the full plan:

---

## Sub-Phase A: Dashboard Enhancements

### 1. Next Scheduled Posts widget
- Query `posts` table for upcoming `scheduled_at` dates (future only), limit 5, ordered ascending
- Display as a list: `Mar 5 — Instagram Post` with platform icon and post title
- Add below the stats cards on Dashboard

### 2. Content Calendar View (Board/Calendar toggle on Approvals page)
- Add a toggle (Tabs component: "Board" | "Calendar") at the top of `Approvals.tsx`
- **Calendar View**: Month grid using `react-day-picker` or a simple custom grid
- Posts with `scheduled_at` rendered as dots/chips on their date
- Click a date to see posts scheduled for that day
- The existing Kanban board remains the "Board" view

**Files changed:** `src/pages/Dashboard.tsx`, `src/pages/Approvals.tsx`

---

## Sub-Phase B: What's New / Add-On Request System

### 1. Convert "Learn More" to "Request Add-On"
- Update `WhatsNew.tsx` cards: button becomes "Request Package"
- On click, insert a row into a new `addon_requests` table:
  - `id`, `client_id`, `user_id`, `addon_name`, `status` (default: 'new'), `created_at`
- Show toast confirmation: "Request submitted! We'll be in touch."

### 2. Database migration
- Create `addon_requests` table with RLS (clients see own, SS sees all)

### 3. Admin visibility
- Add an "Add-On Requests" section to admin area so SS can see incoming leads

**Files changed:** `src/pages/WhatsNew.tsx`, new migration, `src/pages/admin/` (new or existing page)

---

## Sub-Phase C: Admin Panel Enhancements

Review existing admin capabilities vs requirements:

| Capability | Current Status |
|---|---|
| Create client | Done (AdminClients) |
| Create post cards | Done (Approvals, SS-only) |
| Upload creative | Done (PostDetail version upload) |
| Edit captions | Partially done — need inline edit on PostDetail |
| Move cards between columns | Done (drag-drop, SS has full access) |
| Approve profile updates | Done (AdminProfileUpdates) |

### Missing: Edit captions inline
- Add an "Edit" button on the Caption card in `PostDetail.tsx` (SS-only)
- Toggle to editable Textarea, save updates the post + creates a new version

**Files changed:** `src/pages/PostDetail.tsx`

---

## Sub-Phase D: Automation Webhooks (ClickUp + Notifications)

This requires edge functions and external API keys.

### 1. ClickUp Integration (on request creation)
- Create edge function `clickup-webhook` that:
  - Receives request data (client name, type, notes, attachment URL)
  - Creates a task in ClickUp via their API (`POST /api/v2/list/{list_id}/task`)
- Call this function from `Requests.tsx` after successful request creation
- **Requires**: `CLICKUP_API_KEY` and `CLICKUP_LIST_ID` secrets

### 2. Notification on Approval/Change Request
- Create edge function `notify-approval` that:
  - On "approve": sends Slack message or email: "Post approved for {client}"
  - On "request_changes": notifies Gavin (design) and Tristan (client ops)
- Call from `PostDetail.tsx` after successful approval submission
- **Requires**: Slack connector OR email notification setup

### 3. GHL Lead Creation (on add-on request)
- Create edge function `ghl-addon-lead` that posts to GoHighLevel API when an add-on is requested
- **Requires**: `GHL_API_KEY` secret

**Files changed:** New edge functions, `src/pages/Requests.tsx`, `src/pages/PostDetail.tsx`, `src/pages/WhatsNew.tsx`

---

## Recommended Implementation Order

1. **Sub-Phase A** — Dashboard + Calendar (no external dependencies)
2. **Sub-Phase B** — Add-On Requests (needs migration, no external APIs)
3. **Sub-Phase C** — Caption editing (small, self-contained)
4. **Sub-Phase D** — Automations (requires API keys from you)

For Sub-Phase D, I will need you to provide:
- ClickUp API key and List ID
- Slack workspace connection (or preferred notification method)
- GoHighLevel API key

Shall I start with Sub-Phase A (Dashboard + Calendar)?

