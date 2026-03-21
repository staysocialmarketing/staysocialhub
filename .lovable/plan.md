

# Unified Voice Agent Architecture: Full Conversation → Confirm → Execute

## Overview

Replace the current record-and-transcribe voice input with a real-time ElevenLabs conversational agent inside the Hub Assistant. The agent has a natural voice conversation with the user, collecting intent. When the call ends, the transcript is sent to Lovable AI to extract structured actions, which are presented as a confirmation card before any database writes happen.

## Architecture

```text
User speaks → ElevenLabs Agent (WebSocket, signed URL)
            → Natural voice conversation (no DB writes during call)
            → Call ends → transcript captured

Transcript → hub-assistant edge function (existing)
           → Lovable AI extracts structured actions via tool-calling
           → Returns action list (not executed yet)

Action list → UI confirmation card
            → User reviews/edits/approves
            → Client sends "execute" request → edge function executes tools
```

## Security

- ElevenLabs signed URL generated server-side (existing `elevenlabs-conversation-token` function)
- No DB writes during the voice call — agent is purely conversational
- Action extraction and execution happen through the existing JWT-authenticated `hub-assistant` edge function
- Client users remain scoped to their own client_id
- SS role checks enforced server-side for task/project queries

## Changes

### 1. Edge Function: `supabase/functions/hub-assistant/index.ts`

Add a new mode: `extract_actions`. When the client sends `{ mode: "extract_actions", transcript: [...] }`:
- Send transcript to Lovable AI with `tool_choice: "auto"` and the existing role-based tools
- Instead of executing tool calls, return the proposed actions as structured JSON: `{ actions: [{ tool: "create_request", args: {...}, summary: "..." }] }`
- Add a second mode: `{ mode: "execute_actions", actions: [...] }` that actually runs the tools (reusing existing execution logic)
- Existing text chat mode (`messages` array) continues working unchanged

Also add dynamic system prompt for the ElevenLabs agent:
- New endpoint path or query param `?prompt=true` that returns the role-appropriate system prompt text (for use with ElevenLabs agent overrides)
- The prompt instructs the voice agent to be conversational, gather details about what the user wants to create/capture, and NOT execute anything

### 2. Component: `src/components/GlobalCaptureButton.tsx`

Add voice mode to the assistant interface:
- Add a `Mic` icon button that toggles into a voice call UI (reusing patterns from `VoiceCallPanel`)
- When voice mode is active: show the orb visualization (pulsing circle), "Listening..." / "AI speaking..." status, and an "End Call" button
- Use `useConversation` from `@elevenlabs/react` with `signedUrl` + `connectionType: "websocket"`
- Pass dynamic `overrides.agent.prompt` with role-aware instructions (fetched from edge function or constructed client-side from role context)
- On call end: collect transcript → send to `hub-assistant` with `mode: "extract_actions"` → show confirmation card

**Confirmation card UI:**
- Replaces chat area after extraction
- Lists each proposed action as a card: icon + summary + editable fields (topic, type, priority)
- "Confirm All" button → sends `mode: "execute_actions"` to hub-assistant
- "Cancel" button → discards and returns to menu
- Individual action "Remove" button to skip specific items

### 3. ElevenLabs Agent Configuration Note

The ElevenLabs agent (already configured with `ELEVENLABS_AGENT_ID`) will receive dynamic prompt overrides at session start. The override prompt tells the agent:
- "You are the Hub Assistant for Stay Social. Have a natural conversation to understand what the user needs."
- "Gather details: what they want to create, for which client, any specifics."
- "Summarize what you'll do at the end of the call."
- "Do NOT execute any actions — just collect information."

No changes needed in ElevenLabs dashboard — overrides are passed via `startSession({ signedUrl, overrides })`.

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Add `extract_actions` and `execute_actions` modes |
| `src/components/GlobalCaptureButton.tsx` | Add voice call UI with ElevenLabs, confirmation card after call |

## What This Enables Next

- **Sub-agent contexts**: Same architecture works for interviews (different override prompt) and strategy sessions
- **Brand Twin context**: Add client's brand twin data to the override prompt for personalized voice interactions
- **Batch operations**: Confirmation card pattern prevents duplicate requests/tasks from mid-conversation corrections

