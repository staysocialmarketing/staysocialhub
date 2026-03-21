

# Fix Hub Assistant: Add Task Creation Tool + Full Field Support

## Problems Identified

1. **Text chat creates requests, not tasks** — The AI only has `create_request` and `capture_idea` tools. When you say "create a task," it creates a request (which auto-creates a task via trigger), but the trigger only copies `topic` → title. It drops description, assignee, priority mapping, etc.

2. **Voice flow still not processing** — The ElevenLabs connection + extraction pipeline has too many sequential steps with no resilience. If any step fails silently, nothing happens.

3. **AI doesn't know all pages or available fields** — The system prompt lists capabilities generically but doesn't enumerate task fields (description, assignee, project, due date, priority, client) or platform pages.

## Plan

### 1. Add `create_task` Tool (the main fix)

**File:** `supabase/functions/hub-assistant/index.ts`

Add a new `create_task` tool available to SS Admin/Team roles:
- Parameters: `title`, `description`, `client_name`, `assigned_to_name`, `project_name`, `priority` (low/normal/high/urgent), `due_date`, `status` (backlog/todo/in_progress)
- In `executeTool`: resolve `client_name` → client_id, `assigned_to_name` → user_id, `project_name` → project_id (new `resolveProjectByName` helper)
- Insert directly into `tasks` table with all fields
- Also insert into `task_activity_log`
- Add to `ssOnlyTools` array (clients should not create tasks directly)

### 2. Enrich System Prompt with Platform Knowledge

**File:** `supabase/functions/hub-assistant/index.ts` — `buildSystemPrompt()`

Add to SS system prompt:
- Full list of available tools with field descriptions
- Platform pages: Dashboard, Requests, Approvals, Workflow, Calendar, Tasks, Projects, Think Tank, Inbox, Client Brain, Client Strategy, Users, Media, Content Library
- Task fields: title, description, client, project, assignee (team member name), priority, due date, status
- Request fields: topic, type, notes, priority, client, assignee

### 3. Improve Voice Pipeline Reliability

**File:** `src/components/GlobalCaptureButton.tsx`

- Add `try/catch` around the entire `handleVoiceCallEnd` flow with a guaranteed fallback toast on failure
- Add console logging at each step (transcript capture, extraction call, response parsing) to help debug silent failures
- If voice transcript is empty but call was connected for >5 seconds, show a specific message: "Voice call connected but no speech was detected"

### 4. Update `extract_actions` to Include `create_task`

**File:** `supabase/functions/hub-assistant/index.ts` — `extract_actions` mode

- Include `create_task` in the tools list for extraction (currently only filters to `create_request` and `capture_idea`)
- Update `execute_actions` to also allow `create_task` tool execution
- Add summary format for task actions: `Create task: "title" (assigned to X)`

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Add `create_task` tool, enrich system prompt with platform knowledge, update extract/execute to support tasks |
| `src/components/GlobalCaptureButton.tsx` | Better voice error handling, add logging, improve empty transcript detection |

No database changes needed — tasks table already has all required columns.

