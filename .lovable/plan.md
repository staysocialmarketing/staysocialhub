

# Fix Voice Agent Silent / Immediate Disconnect

## Root Cause

Console logs reveal the exact failure sequence:
1. WebSocket connects then closes immediately (code 1006)
2. LiveKit warns: "v1 RTC path not found" — WebRTC handshake fails
3. SDK retries, `onConnect` fires, then `onDisconnect` fires immediately
4. `hasStarted` is still `false` (React setState is async) so the transcript is never saved
5. The agent's first message falls through to the text chat instead of voice

Two problems to fix:
- **WebRTC connection failing** — switch to WebSocket (signed URL) which is more compatible with preview environments
- **`hasStarted` race condition** — `onDisconnect` reads stale state because `setHasStarted(true)` hasn't committed yet

## Changes

### 1. Edge function: return signed URL instead of conversation token

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`

Change the ElevenLabs API call from:
- `GET /v1/convai/conversation/token?agent_id=...` → returns `{ token }`

To:
- `GET /v1/convai/conversation/get-signed-url?agent_id=...` → returns `{ signed_url }`

Return `{ signed_url }` to the client.

### 2. VoiceCallPanel: use WebSocket + fix state race

**File:** `src/components/brain/VoiceCallPanel.tsx`

- Change `startSession({ conversationToken, connectionType: "webrtc" })` to `startSession({ signedUrl, connectionType: "websocket" })`
- Update `startCall` to fetch `signed_url` instead of `token`
- Replace `hasStarted` state with a ref (`hasStartedRef`) so `onDisconnect` reads the current value immediately without waiting for React re-render
- Keep all existing diagnostic logging

### Files Summary

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Switch to signed URL endpoint |
| `src/components/brain/VoiceCallPanel.tsx` | Use WebSocket connection + fix hasStarted race with ref |

