
Goal: make voice flow as reliable/fast as text flow, clearly show progress, and ensure voice-created “task” intents actually produce tasks.

What I found from current code/data:
1) Voice finalize is fragile:
- `onDisconnect` only processes transcript when `assistantView === "voice-call"`.
- Closing/back navigation can reset state before processing, so transcript/action extraction never runs.
- This matches your “keeps connecting / not sure if it went through” symptom.

2) Voice often doesn’t create tasks:
- Voice extraction currently doesn’t receive route context in `extract_actions`.
- In practice, task-like intents can still map to `create_request`.
- DB confirms recent `hub_assistant` writes were requests, with no corresponding task rows.

3) No reliable completion signal:
- Notification is only inserted after successful `execute_actions`.
- If extraction/finalization never starts, no notification/toast confirms outcome.

Implementation plan

1) Make voice completion deterministic (no more stuck “connecting”)
- File: `src/components/GlobalCaptureButton.tsx`
- Add a voice run state machine (`idle → connecting → live → ending → extracting → ready → executing → done/error`).
- Remove dependency on `assistantView` inside `onDisconnect`; use an explicit `activeVoiceRunRef`.
- Add a forced finalize fallback (e.g. 1.5–2s after End Call) so extraction starts even if disconnect callback is delayed/missed.
- Prevent `resetAll()` from clearing transcript while run is ending/extracting.

2) Keep processing alive after drawer close and show clear status
- File: `src/components/GlobalCaptureButton.tsx`
- Move extract/execute flow into a ref-stable async runner that is not canceled by UI close.
- Persistent toasts with explicit phases:
  - “Call ended. Processing…”
  - “Extracting actions… (Ns)”
  - “Ready for confirmation” / “Created X items” / detailed failure reason.
- Add expected timing copy: “Usually 3–8s after call end.”

3) Improve task intent mapping for voice (team/admin contexts)
- File: `supabase/functions/hub-assistant/index.ts`
- Pass `current_route` from client for `extract_actions`.
- Update extraction prompt rules:
  - On `/team/tasks`, default task/to-do wording to `create_task` unless user explicitly asks for a request.
  - Extract full task fields when spoken: title, description, assignee, priority, due date, project, client.
- Keep role restrictions intact (client users cannot create internal tasks/projects).

4) Add pre-execution validation + clearer confirmation UX
- Files: `src/components/GlobalCaptureButton.tsx`, `supabase/functions/hub-assistant/index.ts`
- Validate each proposed action before execute; surface inline errors (missing client, unresolved assignee, invalid date).
- Keep “Require client pick” behavior, but show explicit blocking label: “Client required before confirm.”
- Return per-action diagnostic codes from edge function for clean UI error messages.

5) Reliable completion notifications
- File: `supabase/functions/hub-assistant/index.ts`
- Create notifications for both:
  - success (`Hub Assistant completed`)
  - failure (`Hub Assistant needs review`) with top error.
- Include links by action type (`/team/tasks` for task-heavy runs, `/requests` for request-heavy runs).

Technical detail (state flow)
```text
End Call clicked
→ mark run as ending
→ endSession()
→ onDisconnect OR fallback timer (whichever first)
→ extract_actions(current_route, transcript)
→ confirmation ready (or error)
→ execute_actions
→ toast + notification + query invalidation
```

No database schema changes required for this fix.
