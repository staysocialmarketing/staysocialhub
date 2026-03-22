

# Fix: Voice Interview Disconnecting — Remove Overrides

## Root Cause (High Confidence)

From a known ElevenLabs SDK bug (GitHub issue #134): **passing `overrides` in `startSession` with WebSocket causes immediate disconnect**. The log pattern matches exactly — connects, first message arrives, disconnects ~1.9s later.

Your Hub Assistant uses the same pattern and may have the same intermittent issue, but the interview flow hits it consistently.

## Solution: Remove overrides, use contextual update instead

### `src/components/brain/VoiceCallPanel.tsx`

1. **Remove `overrides` and `connectionType` from `startSession`** — call it with just `{ signedUrl: signed_url }`
2. **After connection establishes** (in `onConnect`), call `conversation.sendContextualUpdate(promptText)` to inject the template-specific interview context without destabilizing the WebSocket
3. The agent's default first message from the ElevenLabs dashboard will play (generic), but the contextual update ensures subsequent responses follow the interview template persona

This is the minimal change to test the theory. If it works (call stays alive), we can then explore getting personalized first messages back without overrides.

### No edge function changes needed

The token endpoint already returns `prompt` and `first_message` — we just won't pass them as overrides anymore.

| File | Change |
|---|---|
| `src/components/brain/VoiceCallPanel.tsx` | Remove `overrides` + `connectionType` from `startSession`; send context via `sendContextualUpdate` after connect |

