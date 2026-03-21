

# Phase 6B: Client Experience Polish

Phase 6A (Content Generator + Voice Reliability) is complete. Moving to Phase 6B with three items.

---

## 1. Client Reporting Dashboard

Add a "My Results" tab to Success Center showing content performance metrics.

**Database:**
- New `content_metrics` table: `id`, `post_id` (references posts), `client_id`, `impressions`, `reach`, `engagement`, `clicks`, `reported_at`, `created_at`
- RLS: SS can manage all; clients can view own (`can_access_client(client_id)`)

**SS-side: Metrics Entry**
- Add a "Metrics" tab or section to the post detail view (in `WorkflowCardDialog` or Approvals) where SS team can input impressions/reach/engagement/clicks per post
- Bulk import option (CSV upload) as a stretch goal

**Client-side: Results View**
- New component `ClientResults.tsx` embedded as a tab in `SuccessCenter.tsx`
- Charts using recharts (already installed): posts published over time (bar chart), engagement trend (line chart), top 5 posts by engagement (horizontal bar)
- Summary stat cards: total posts published, avg engagement rate, total reach

| File | Change |
|---|---|
| Migration | New `content_metrics` table with RLS |
| `src/components/ClientResults.tsx` | New — charts + stat cards for client metrics |
| `src/pages/client/SuccessCenter.tsx` | Add "Results" tab using Tabs component |
| `src/components/WorkflowCardDialog.tsx` | Add metrics input section for SS roles |

---

## 2. Client Onboarding Wizard

Guided first-time experience for new client users. The `OnboardingTracker` component already exists and uses a `client_onboarding` table — this is the SS-managed checklist. The wizard is different: it's a guided modal for the client's first login.

**Detection:** On Success Center load, check if `brand_twin` record exists and `brain_captures` count > 0. If neither exists, show the wizard overlay.

**Steps:**
1. Welcome — "Welcome to Stay Social HUB!" with client name
2. Brand Voice — Simplified form or link to AI Interview
3. First Capture — Quick capture form (text note or voice)
4. Done — Confetti + redirect to Success Center

**Tracking:** Add `onboarding_completed` boolean column to `users` table (or use a `client_onboarding_wizard` table). Simpler: store a flag in `client_success_extras` as `wizard_completed: boolean`.

| File | Change |
|---|---|
| `src/components/ClientOnboardingWizard.tsx` | New — multi-step modal wizard |
| `src/pages/client/SuccessCenter.tsx` | Show wizard on first visit |
| Migration | Add `wizard_completed` boolean to `client_success_extras` (default false) |

---

## 3. Request Status Tracking for Clients

Clients submit requests but can't see progress. Add timeline + notifications.

**Request Activity Timeline:**
- Reuse `ActivityTimeline` component pattern
- In `RequestDetailDialog`, add a timeline section showing: creation, status changes, comments, completion
- Source data from `comments` (already exists) + a new `request_activity` table or reuse `task_activity_log` via the linked `task_id`

**Simpler approach:** Since requests auto-create tasks, and `task_activity_log` tracks status changes on tasks, query the linked task's activity log and display it on the request detail.

**Notifications:**
- Add a trigger `notify_client_on_request_status_change` — when `requests.status` changes, notify the `created_by_user_id`
- Deduped via `notification_key`

| File | Change |
|---|---|
| `src/components/RequestDetailDialog.tsx` | Add activity timeline section using linked task's activity log |
| Migration | New trigger `notify_client_on_request_status_change` on `requests` table |

---

## Implementation Order

```text
1. Client Reporting Dashboard  — new table + charts + metrics entry
2. Request Status Tracking     — timeline + notification trigger (smaller scope)
3. Client Onboarding Wizard    — wizard modal + detection logic
```

## Updated Roadmap File

Update `.lovable/plan.md` to mark Phase 6A as complete and Phase 6B as in progress.

