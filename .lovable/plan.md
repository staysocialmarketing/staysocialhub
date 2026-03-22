
Goal: stop voice interviews from auto-ending right after the first “website strategist” line and make recovery seamless when disconnects still happen.

## What I found from current logs/code
- Session is successfully connecting and receiving first agent message.
- Disconnect happens ~1.5–1.9s later (`onConnect -> first message -> onDisconnect`), so this is not a token/auth failure.
- Current interview voice flow differs from your known working Hub flow in key ways:
  - no explicit `connectionType: "websocket"` in `startSession`
  - immediate `sendUserActivity()` on connect + aggressive 4s heartbeat
  - no use of disconnect reason payload to branch recovery logic

## Implementation plan

### 1) Align interview voice session startup with known stable pattern
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Set explicit `connectionType: "websocket"` in `conversation.startSession(...)`.
- Add a 12s connection-timeout watchdog (same reliability pattern as Hub voice).
- Keep overrides, but make startup deterministic and single-flight (`isStartingRef` stays).

### 2) Replace aggressive early heartbeat with safer activity strategy
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Remove immediate `sendUserActivity()` on `onConnect`.
- Start heartbeat only after conversation is stable (first user transcript or small grace window), then ping every ~8–10s.
- Clear heartbeat on disconnect/unmount.

Why: current disconnect timing suggests the session is being closed shortly after first turn; reducing early control messages avoids destabilizing the first exchange.

### 3) Use disconnect/error details to recover intelligently
**File:** `src/components/brain/VoiceCallPanel.tsx`
- Update callbacks to SDK-native signatures:
  - `onDisconnect(details)`
  - `onError(message, context)`
- Classify disconnects (`user`, `agent`, `error`) and elapsed time.
- If `agent/error` disconnect happens very early with no user speech:
  - auto-retry once in “safe mode” (same session but without overrides)
  - if second failure: show clear CTA to retry or continue in text mode.

### 4) Preserve context/transcript across retries and fallback
**Files:** 
- `src/components/brain/VoiceCallPanel.tsx`
- `src/components/brain/InterviewTab.tsx`
- Do not wipe transcript on internal reconnect attempts.
- Keep assistant opening line so context is preserved if user switches to text.
- Add “Continue in Text” action from early-disconnect UI, using the same template thread.

### 5) Keep interview prompt pacing but reduce startup complexity
**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`
- Keep one-question first messages (already done), but avoid extra startup verbosity in first turn prompts.
- No database changes required.

## Validation checklist
1. Start Website Discovery voice interview: connection remains active at least 30s after first line.
2. Speak one answer: user transcript appears and call remains connected.
3. Stay silent briefly: call should not instantly end; if it does, auto-retry triggers once.
4. After forced second failure: “Retry Voice” and “Continue in Text” both work.
5. Repeat on at least 2 other templates to confirm no regressions.
