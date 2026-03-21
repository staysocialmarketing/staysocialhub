

# Phase 7: Integrations + Automation

Phase 7 involves external platform connections and automation rules. However, social platform OAuth (Meta, LinkedIn, X) requires registered developer apps and API keys that aren't available yet, and email sending requires domain setup. These are infrastructure-heavy items that need external setup before code is useful.

A more impactful next step is the **Automation Rules Engine** — it's entirely internal, immediately useful, and builds on existing triggers/notifications.

## What to Build Now: Automation Rules Engine

An admin UI + backend that lets SS team define rules like:
- "When a request is submitted, auto-assign to [user]"
- "When a post reaches client_approval, notify client"
- "When a task is created for [client], assign to [user]"

### Database

New `automation_rules` table:
- `id`, `name`, `trigger_event` (enum: request_created, post_status_changed, task_created, task_status_changed)
- `conditions_json` (e.g., `{ "client_id": "...", "content_type": "video" }`)
- `action_type` (enum: assign_user, notify_user, change_status, add_tag)
- `action_config_json` (e.g., `{ "user_id": "..." }`)
- `is_active`, `created_by_user_id`, `created_at`
- RLS: SS admin can manage, SS team can view

### Backend: Database Trigger + Edge Function

- Add a generic trigger on `requests` (INSERT) and `posts` (UPDATE of `status_column`) that calls a `process-automation-rules` edge function via `pg_net`
- The edge function fetches active rules matching the event, evaluates conditions, and executes actions (update assignee, insert notification, etc.)

### Admin UI

New page at `/admin/automations` (add to sidebar under Admin section):
- List of rules with name, trigger, action, active toggle
- Create/edit dialog with:
  - Name field
  - Trigger picker (dropdown)
  - Condition builder (client picker, content type, status value)
  - Action picker (assign to user, notify user, change status)
  - Action config (user picker, status picker)
- Delete with confirmation

### Files Summary

| File | Change |
|---|---|
| Migration | New `automation_rules` table with RLS |
| `supabase/functions/process-automation-rules/index.ts` | New edge function to evaluate and execute rules |
| Migration (trigger) | Triggers on `requests` INSERT and `posts` UPDATE to call edge function |
| `src/pages/admin/AdminAutomations.tsx` | New — rule list + create/edit UI |
| `src/components/AppSidebar.tsx` | Add Automations link under Admin section |
| `src/App.tsx` | Add route for `/admin/automations` |
| `.lovable/plan.md` | Mark Phase 7 item 8 as in progress |

