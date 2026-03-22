
Goal: stop interview voice calls from dropping right after the “website strategist” opening line, and preserve transcript/context when disconnects happen.

## What’s likely happening (from logs + code)
- Session connects and first agent message arrives, then disconnects almost immediately.
- `VoiceCallPanel` currently starts session without an explicit `connectionType`, unlike your working Hub voice flow.
- Message parsing only handles `type === "agent_response"` / `user_transcript`, but your runtime payload is often compact (`{ role, message }`), so transcript stays empty (`transcript length: 0`).
- Keep-alive starts too late for early-turn drops and runs every 10s.

## Implementation plan

### 1) Stabilize voice session startup
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Add a strict start guard (`isStartingRef`) so `startCall()` cannot run twice in parallel.
- Start session with explicit WebSocket mode:
  - `conversation.startSession({ signedUrl, connectionType: "websocket", overrides: ... })`
- Reset `callEnded` and transcript refs on each new start attempt.

### 2) Improve keep-alive timing for first-turn reliability
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Send `conversation.sendUserActivity()` immediately on connect.
- Reduce heartbeat interval from 10s to 3–5s while connected.
- Clear heartbeat on disconnect/unmount as today.

### 3) Parse both ElevenLabs message formats
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Extend `onMessage` parser to support both:
  - typed events (`agent_response`, `user_transcript`)
  - compact events (`{ role: "agent" | "user", message: "..." }`)
- This ensures assistant/user turns are captured, transcript is not empty, and post-call behavior is reliable.

### 4) Add early-disconnect recovery UX
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Track session start time.
- If disconnect happens very early (e.g., <10s) and no user speech yet:
  - auto-retry once in-place, or show a one-click “Reconnect Voice Call” CTA.
- Keep existing “Return to Chat” fallback so users never get stuck.

### 5) Tighten website voice opener pacing
**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`
- Make `website_discovery` first message one-question only (no stacked questions).
- Align all interview voice first messages to single-question pacing.
- Keep prompt overrides as-is.

## Validation checklist
1. Start Website Discovery voice call and confirm it stays connected past first prompt.
2. Speak once; verify user transcript appears in panel.
3. Let silence sit for >20s; confirm session remains alive.
4. End call manually; confirm transcript returns to chat.
5. Repeat on other templates to confirm no regression.
