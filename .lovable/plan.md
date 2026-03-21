

# Fix Voice Agent: Hub Knowledge, Auto-End, and Post-Call UX

## Three Problems Identified

1. **Agent doesn't know enough about the Hub** — The voice system prompt (`buildVoiceSystemPrompt`) is minimal. It tells the agent to "collect info" but gives zero context about what Stay Social HUB is, what types of requests exist, what plans/services are offered, etc. The text chat prompt (`buildSystemPrompt`) is slightly better but also thin.

2. **No auto-end mechanism** — If the user is done talking, the call keeps running, burning ElevenLabs credits. There's no instruction for the agent to signal "we're done" and no client-side idle timeout.

3. **Post-call UX is poor** — After ending the call, it jumps to "confirm" view with a spinner ("Processing your conversation...") but if you close the drawer, you lose everything. No indication it's still working, no persistence, no fallback.

## Plan

### 1. Enrich Voice Agent System Prompt

**File:** `supabase/functions/hub-assistant/index.ts` — `buildVoiceSystemPrompt()`
**File:** `supabase/functions/elevenlabs-conversation-token/index.ts` — `buildVoiceSystemPrompt()`

Add Hub context to both voice prompt functions:
- What Stay Social HUB is (social media marketing management platform)
- Available request types: social posts, email campaigns, designs, videos, automation, strategy, general
- What "capturing an idea" means (saving a note/link/thought to the client's brain for later use)
- Route-aware context (reuse existing `getRouteContext` in the token function, add it to hub-assistant's voice prompt too)

### 2. Auto-End Voice Call

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts` — voice prompt
- Add instruction: "When you have gathered all the information and summarized the actions, say goodbye and end the conversation naturally. Say something like 'Great, I've got everything! I'll have your items ready for review. Talk soon!'"

**File:** `src/components/GlobalCaptureButton.tsx`
- Add an idle timeout: if no `onMessage` events for 15 seconds while connected, auto-end the call
- Track last message timestamp in a ref, check with `setInterval`

### 3. Improve Post-Call Processing UX

**File:** `src/components/GlobalCaptureButton.tsx`

- **Prevent closing during processing**: When `extracting` or `executing` is true, intercept the drawer/dialog close and show a warning or simply block it
- **Better loading state**: Replace generic "Processing your conversation..." with a stepped progress indicator: "Analyzing conversation..." → "Extracting actions..." → "Almost ready..."
- **Toast on background completion**: If somehow the drawer closes, still run the extraction and show a toast with results (this requires keeping the extraction in a ref-based promise that doesn't depend on component mount)
- **Keep drawer open during extraction**: The simplest fix — disable the close button / prevent `handleOpen(false)` while extracting

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Enrich voice prompt with Hub knowledge + auto-end instruction |
| `supabase/functions/hub-assistant/index.ts` | Enrich `buildVoiceSystemPrompt` with Hub context and route awareness |
| `src/components/GlobalCaptureButton.tsx` | Add idle auto-end timer, block close during processing, better loading states |

No database changes needed.

