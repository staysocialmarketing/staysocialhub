

# Debug Voice Agent Silence + Create Client AI Pages

## Issue: Voice Agent Not Speaking

The edge function works — it returns a valid ElevenLabs conversation token (confirmed just now). The WebRTC connection establishes successfully (UI shows "Listening..."). But the agent never speaks.

Since the ElevenLabs dashboard config hasn't changed, the issue is likely one of:
1. **No event data reaching `onMessage`** — the callback may not be firing
2. **Browser autoplay policy** blocking WebRTC audio output
3. **Agent first message** not triggering despite being configured

**The fix is diagnostic first**: Add `console.log` statements to every callback in `VoiceCallPanel.tsx` (`onConnect`, `onDisconnect`, `onMessage`, `onError`) so we can see exactly what events arrive. Also log the raw `message` object in `onMessage` to see if events come through with unexpected structure.

### Changes to `src/components/brain/VoiceCallPanel.tsx`
- Add `console.log("EL onConnect")` in `onConnect`
- Add `console.log("EL onMessage", JSON.stringify(message))` in `onMessage`
- Add `console.log("EL onError", error)` in `onError`
- Add `console.log("EL onDisconnect")` in `onDisconnect`

This will let us test and see exactly what's happening in the console.

---

## New Client-Facing AI Tool Pages

Three new routes for client users to access AI tools directly.

### `src/pages/client/AIInterview.tsx` — Create
- Wraps existing `InterviewTab` component
- Fetches logged-in user's `client_id` from their profile
- Shows error if no client linked

### `src/pages/client/ContentGenerator.tsx` — Create
- "Coming Soon" placeholder page
- Brief description of what it will do

### `src/pages/client/BrandTwin.tsx` — Create
- Read-only view of the client's Brand Twin data from `brand_twin` table
- Shows 5 sections: Brand Basics, Voice, Audience, Offers, Content Rules
- Card-based layout

### `src/App.tsx` — Add 3 routes
- `/client/ai-interview` → AIInterview
- `/client/generate` → ContentGenerator
- `/client/brand-twin` → BrandTwin

---

## Files Summary

| File | Action |
|---|---|
| `src/components/brain/VoiceCallPanel.tsx` | Add console logging to all callbacks |
| `src/pages/client/AIInterview.tsx` | Create |
| `src/pages/client/ContentGenerator.tsx` | Create |
| `src/pages/client/BrandTwin.tsx` | Create |
| `src/App.tsx` | Add 3 client routes |

