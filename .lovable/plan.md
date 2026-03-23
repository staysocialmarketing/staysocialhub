

# Fix: Voice Interview Disconnecting — Remove `sendContextualUpdate`

## Root Cause

The console logs show the exact pattern every time:
1. `onConnect` fires
2. `sendContextualUpdate` is called immediately
3. Agent speaks first message
4. `onDisconnect` fires ~3.6 seconds later

The Hub Assistant voice (GlobalCaptureButton) does NOT use `sendContextualUpdate` and stays connected reliably. The interview flow calls it immediately on connect, which destabilizes the WebSocket and causes the agent to disconnect after its first utterance.

`sendContextualUpdate` is only used because we removed `overrides` from `startSession` (which also caused disconnects). The interview-specific prompt was being injected post-connection as a workaround — but this workaround itself causes disconnects.

## Solution

Stop trying to customize the agent at runtime entirely. Instead, rely on the **default agent configuration** from ElevenLabs dashboard. The interview context will be handled purely in the text chat (which already works). Voice mode becomes a simpler "talk to the default agent" experience.

### `src/components/brain/VoiceCallPanel.tsx`
1. **Remove `sendContextualUpdate` call** from `onConnect` — delete the `pendingContextRef` logic entirely
2. **Remove `pendingContextRef`** — no longer needed
3. **Add `connectionType: "websocket"` explicitly** to `startSession` (matching the stable Hub pattern)
4. Keep everything else (retry logic, transcript capture, early disconnect detection)

### No edge function changes
The token endpoint still returns `prompt` and `first_message`, but the client will simply not use them for overrides or contextual updates. The text-mode interview (which works fine) continues using these.

## What This Means
- Voice interviews will use the agent's default persona from the ElevenLabs dashboard
- The specific template personality (brand strategist, website strategist, etc.) won't be injected into voice mode
- Text interviews remain fully customized per template
- Voice calls will actually stay connected

| File | Change |
|---|---|
| `src/components/brain/VoiceCallPanel.tsx` | Remove `sendContextualUpdate` + `pendingContextRef`; add explicit `connectionType: "websocket"` |

