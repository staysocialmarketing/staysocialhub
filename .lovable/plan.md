

# Fix: Voice Call Stuck After Disconnect

## Problem
When the ElevenLabs agent stops talking (timeout or natural end), the WebSocket disconnects. The component then:
1. Hides the "End Call" button (gated on `isConnected`)
2. Doesn't show the pre-call screen (gated on `!hasStartedRef.current`, which is `true`)
3. User is stuck on a dead screen with no way out

## Solution

### `src/components/brain/VoiceCallPanel.tsx`

Two fixes:

1. **Always show an exit button** — when disconnected but `hasStartedRef.current` is true, show a "Done" / "Return to Chat" button that calls `onCallEnd` or `onCancel`

2. **Handle `onDisconnect` more gracefully** — show a toast notifying the user the call ended, and add a `disconnected` state so the UI shows a clear "call ended" screen with the transcript and a button to continue

Specifically:
- Add a `callEnded` state, set to `true` in `onDisconnect` when `hasStartedRef.current` is true
- When `callEnded` is true, show a "Call ended" status in the header and a "Return to Chat" button
- Change the "End Call" button condition from `isConnected || isConnecting` to `isConnected || isConnecting || callEnded` (or always show it after call started)
- Show a toast on unexpected disconnect

| File | Change |
|---|---|
| `src/components/brain/VoiceCallPanel.tsx` | Add `callEnded` state, show exit UI after disconnect, toast on unexpected end |

