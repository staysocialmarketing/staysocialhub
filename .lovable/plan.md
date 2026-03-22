

# Fix: Interviews Not Starting (WebRTC Connection Failure)

## Diagnosis

Console logs show the exact error: **"Initial connection failed: v1 RTC path not found. Consider upgrading your LiveKit server version"**. The WebRTC migration we just made is incompatible with your ElevenLabs agent's underlying infrastructure. The connection briefly reports "connected" then immediately disconnects with zero transcript.

## Solution: Revert to WebSocket + Keep the Keep-Alive

Switch back to the WebSocket connection method (which was working before) while keeping the keep-alive heartbeat fix.

### 1. `supabase/functions/elevenlabs-conversation-token/index.ts`
- Change the ElevenLabs API call back to **signed URL** endpoint: `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=...`
- Return `{ signed_url, prompt, first_message }` instead of `{ token, ... }`

### 2. `src/components/brain/VoiceCallPanel.tsx`
- Switch `startSession` back to using `signedUrl` instead of `conversationToken`
- Remove `connectionType: "webrtc"` (WebSocket is the default)
- Keep the 10-second keep-alive heartbeat (`sendUserActivity()`) — this still helps prevent silence timeouts on WebSocket

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Revert to signed URL endpoint |
| `src/components/brain/VoiceCallPanel.tsx` | Use `signedUrl` instead of `conversationToken`, remove `webrtc` connection type |

