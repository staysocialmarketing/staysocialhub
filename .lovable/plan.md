

# Zapier / AI Agent Preparation Update

## Overview

Add AI/agent metadata fields and strategy brief support across Tasks, Think Tank, and Requests. Add a "Run Strategy" webhook button. Prepare all item types for external automation via Zapier write-backs.

## Phase 1: Database Migration

### New columns on `tasks` table
- `source_type` (text, nullable) — e.g. "capture", "request", "zapier"
- `raw_input_text` (text, nullable)
- `raw_attachment_url` (text, nullable)
- `voice_transcript` (text, nullable)
- `agent_status` (text, nullable, default 'pending_ai_review') — values: pending_ai_review, ai_processed, needs_human_review, approved, rejected
- `agent_confidence` (numeric, nullable)
- `ai_summary` (text, nullable)
- `ai_suggested_client` (text, nullable)
- `ai_suggested_content_type` (text, nullable)
- `ai_suggested_priority` (text, nullable)
- `ai_suggested_assignee` (text, nullable)
- `ai_suggested_project` (text, nullable)
- `ai_suggested_subproject` (text, nullable)
- `ai_suggested_next_action` (text, nullable)
- `ai_suggested_item_type` (text, nullable)
- `strategy_brief` (jsonb, nullable) — stores: objective, audience, angle, hook, cta, recommended_format, production_notes, subject_lines, preview_text, script_draft

### New columns on `think_tank_items` table
Same AI/agent fields as tasks:
- `source_type`, `raw_input_text`, `raw_attachment_url`, `voice_transcript`
- `agent_status`, `agent_confidence`
- `ai_summary`, `ai_suggested_client`, `ai_suggested_content_type`, `ai_suggested_priority`, `ai_suggested_assignee`, `ai_suggested_project`, `ai_suggested_subproject`, `ai_suggested_next_action`
- `strategy_brief` (jsonb, nullable)

### New columns on `requests` table
Same AI/agent fields:
- `source_type`, `raw_input_text`, `raw_attachment_url`, `voice_transcript`
- `agent_status`, `agent_confidence`
- `ai_summary`, `ai_suggested_client`, `ai_suggested_content_type`, `ai_suggested_priority`, `ai_suggested_assignee`, `ai_suggested_project`, `ai_suggested_subproject`, `ai_suggested_next_action`
- `strategy_brief` (jsonb, nullable)
- `task_id` (uuid, nullable) — for linking back to auto-created task

### New columns on `tasks` table (linking)
- `request_id` (uuid, nullable) — link task back to its source request
- `parent_item_id` (uuid, nullable) — generic parent reference for Zapier chaining

All columns nullable with no defaults (except `agent_status` defaults to null). This is purely additive — no breaking changes.

## Phase 2: Global Capture Updates

### `src/components/GlobalCaptureButton.tsx`
- When saving a task, idea, or voice note via capture, populate:
  - `source_type: "capture"`
  - `raw_input_text` (the title + description text)
  - `raw_attachment_url` (if image/voice was uploaded)
- These get stored on the created record for downstream Zapier pickup.

## Phase 3: Strategy Brief Component

### New file: `src/components/StrategyBriefPanel.tsx`
- Reusable read-only panel that renders a `strategy_brief` JSONB object
- Shows structured fields: Objective, Audience, Angle, Hook, CTA, Recommended Format, Production Notes, Subject Lines, Preview Text, Script Draft
- Only renders fields that have values
- Visible to SS roles only

### New file: `src/components/RunStrategyButton.tsx`
- Button labeled "Run Strategy"
- On click, sends a POST to a configurable Zapier webhook URL (stored in a `strategy_webhook_url` field or app settings)
- Sends the item's ID, type (task/request/think_tank), title, description, client_id, and any existing AI fields
- Uses `no-cors` mode per Zapier pattern
- Shows toast: "Strategy request sent to automation"

## Phase 4: AI Fields Panel

### New file: `src/components/AIFieldsPanel.tsx`
- Reusable collapsible panel showing AI recommendation fields
- Shows: AI Summary, Suggested Client, Content Type, Priority, Assignee, Project, Subproject, Next Action, Confidence Score, Agent Status
- Read-only display with badges
- Agent Status shown as a colored badge (pending_ai_review=yellow, ai_processed=blue, needs_human_review=orange, approved=green, rejected=red)
- Only visible to SS roles

## Phase 5: Integration into Detail Views

### `src/components/TaskDetailDialog.tsx`
- Add new tabs: "AI Intake" and "Strategy"
- "AI Intake" tab renders `AIFieldsPanel` with the task's AI fields
- "Strategy" tab renders `StrategyBriefPanel` + `RunStrategyButton`
- Both tabs only visible to SS roles

### `src/pages/team/ThinkTank.tsx`
- In the edit dialog, add collapsible sections for AI Fields and Strategy Brief
- Add "Run Strategy" button to the Action dropdown menu
- Show AI summary badge on cards if populated

### `src/components/RequestDetailDialog.tsx`
- Add collapsible AI Fields section (SS only)
- Add Strategy Brief section and Run Strategy button
- Show `task_id` link if available for request-task relationship

## Phase 6: Webhook Edge Function

### New edge function: `supabase/functions/run-strategy/index.ts`
- Accepts POST with `{ item_type, item_id }`
- Fetches the item from the appropriate table
- Fetches client profile context if client_id is set
- Forwards structured payload to a Zapier webhook URL (stored as a secret `STRATEGY_WEBHOOK_URL`)
- Updates `agent_status` to 'pending_ai_review' on the item
- Returns success

### New edge function: `supabase/functions/agent-writeback/index.ts`
- Accepts POST from Zapier with `{ item_type, item_id, ai_fields, strategy_brief }`
- Validates the payload
- Updates the appropriate table (tasks/requests/think_tank_items) with AI fields and/or strategy brief
- Updates `agent_status` to 'ai_processed'
- Secured with service role key check

## Phase 7: Request-Task Linking

- Update the `auto_create_task_from_request` trigger to set `request_id` on the new task (requires migration to alter the function)
- The trigger already exists; we modify it to also populate the linking field

## Summary

| Area | Files |
|------|-------|
| Migration | 1 SQL migration (add ~15 columns each to 3 tables + linking columns + trigger update) |
| Components | `StrategyBriefPanel.tsx`, `RunStrategyButton.tsx`, `AIFieldsPanel.tsx` (new) |
| Updated UIs | `TaskDetailDialog.tsx`, `ThinkTank.tsx`, `RequestDetailDialog.tsx`, `GlobalCaptureButton.tsx` |
| Edge Functions | `run-strategy/index.ts`, `agent-writeback/index.ts` (new) |
| Secret needed | `STRATEGY_WEBHOOK_URL` — Zapier webhook URL for strategy processing |

