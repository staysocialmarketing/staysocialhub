
Observed from live data and code (so we’re aligned):
- Yes — one Hub Assistant item was created in **Requests** (`topic: "test"`, `type: social_post`, `source_type: hub_assistant`, created at `2026-03-21 03:21:57 UTC`).
- No Hub Assistant-created rows were found in **Tasks** in recent runs.
- No `Hub Assistant completed` notifications were inserted, which means voice likely did not reach `execute_actions` in those runs.
- In `GlobalCaptureButton`, voice finalization is still gated by transcript presence (`voiceTranscriptRef.length > 0`). If transcript events are empty/missing, the run can stay in a pseudo-connecting state and never finalize.

Plan to fix this (fast + reliable + explicit status):

1) Make voice finalization unconditional (remove “silent hang”)
- File: `src/components/GlobalCaptureButton.tsx`
- Always call finalize flow on disconnect/end timeout (do not require transcript length first).
- Move “empty transcript” handling inside finalizer as a terminal state:
  - show clear toast: “Call ended, but no transcript was received.”
  - reset assistant view to chat (no stuck “Connecting…” state).
- Add a hard connection timeout (e.g., 12s) and fail with actionable message.

2) Improve connection reliability and visibility
- File: `src/components/GlobalCaptureButton.tsx`
- Start ElevenLabs session with explicit `connectionType: "websocket"` (same stable pattern used in `VoiceCallPanel`).
- Add `onConnect` handling for definitive state transition to `live`.
- Keep persistent phase toasts through entire lifecycle:
  - Connecting…
  - Call ended, processing…
  - Extracting actions…(Ns)
  - Ready for confirmation / Created X items / Failed with reason.
- Ensure close/navigation does not cancel processing (run tracked in ref + persistent toast).

3) Force task-first behavior on `/team/tasks`
- File: `supabase/functions/hub-assistant/index.ts`
- Tighten extraction rules:
  - On `/team/tasks`, default ambiguous creation intents to `create_task`.
  - Use `create_request` only when user explicitly says request-type intent (“submit request”, “create content request”, etc.).
- Include full task field extraction priority (title, description, assignee, priority, due date, project, client).

4) Make destination explicit before and after confirmation
- File: `src/components/GlobalCaptureButton.tsx`
- In confirmation cards, show destination badge per action:
  - “Will create in Tasks” vs “Will create in Requests”.
- If on `/team/tasks` and any action is `create_request`, show warning copy before confirm:
  - “This will create a Request, not a Task.”

5) Guarantee user-visible completion signal
- Files: `supabase/functions/hub-assistant/index.ts`, `src/components/GlobalCaptureButton.tsx`
- In `execute_actions`, return structured per-action result metadata (`destination`, `id`, `title`, `client_name`, `error_code`).
- Insert notification for:
  - success (including destination link),
  - partial failure,
  - full failure.
- UI shows detailed completion toast and deep-link CTA (`/team/tasks` or `/requests`).

6) Quick verification checklist after implementation
- Voice on `/team/tasks`: “Create a test post assigned to Tristan…” → confirmation should propose `create_task`.
- End call with no transcript events → should not hang; should show explicit “no transcript received.”
- Successful voice run → task/request row appears + notification appears + status toast remains visible even if drawer closes.

No database schema changes required.
