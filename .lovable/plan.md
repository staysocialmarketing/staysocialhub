

# Fix: Voice Call Disconnecting After ~5 Seconds

## Analysis

Your ElevenLabs dashboard settings look correct — "End conversation after silence" is disabled (-1), max duration is 600s. The issue is on the connection side.

The most likely cause is **WebSocket instability**. The current code uses `connectionType: "websocket"` with a `signed_url`. WebRTC is the recommended, more stable connection type for ElevenLabs conversational AI.

## Solution: Switch to WebRTC + Add Keep-Alive

### 1. `supabase/functions/elevenlabs-conversation-token/index.ts`
- Fetch a **WebRTC conversation token** instead of (or in addition to) a signed URL
- Change the ElevenLabs API call from `get-signed-url` to the token endpoint: `POST https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=...`
- Return `{ token, prompt, first_message }` instead of `{ signed_url, ... }`

### 2. `src/components/brain/VoiceCallPanel.tsx`
- Switch from `signedUrl` + `connectionType: "websocket"` to `conversationToken` + `connectionType: "webrtc"`
- Add a **keep-alive interval** using `conversation.sendUserActivity()` every 10 seconds while connected — this signals to ElevenLabs that the user is still present
- Clean up the interval on disconnect/unmount

### 3. Changes Summary

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Fetch WebRTC token instead of signed URL |
| `src/components/brain/VoiceCallPanel.tsx` | Use `conversationToken` + `webrtc`, add keep-alive heartbeat |

