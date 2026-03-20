

# Add ElevenLabs Conversational Agent to AI Interview

## What This Does

Adds a full two-way voice conversation mode to the AI Interview. Users click a "Voice Call" button, grant microphone access, and speak directly with the AI brand strategist — like a phone call. The AI listens, responds verbally, and the entire conversation is transcribed. After the call ends, the transcript feeds into the existing extraction pipeline to update the Brand Twin.

## Prerequisites

### ElevenLabs Agent Setup

You'll need to create a Conversational Agent in the ElevenLabs dashboard (elevenlabs.io):
1. Create a new agent with the brand strategist system prompt
2. Choose a voice (e.g., Sarah) 
3. Configure the agent's first message and behavior
4. Copy the **Agent ID** — we'll need it as a secret

### Connect ElevenLabs

We'll use the ElevenLabs connector to link credentials to the project. This provides `ELEVENLABS_API_KEY` for the token-generation edge function.

---

## Technical Plan

### Step 1: Connect ElevenLabs Connector

Link ElevenLabs credentials to the project via the connector system.

### Step 2: Add Secrets

- `ELEVENLABS_AGENT_ID` — the agent ID from the ElevenLabs dashboard

### Step 3: Create Token Edge Function

**New file:** `supabase/functions/elevenlabs-conversation-token/index.ts`

- Accepts authenticated requests (validates JWT via `getClaims()`)
- Verifies the user has an SS or client role
- Calls ElevenLabs API to generate a WebRTC conversation token using the stored agent ID
- Returns `{ token }` to the client
- Register in `supabase/config.toml` with `verify_jwt = false`

### Step 4: Install React SDK

Add `@elevenlabs/react` package for the `useConversation` hook (handles WebRTC, audio, mic permissions).

### Step 5: Update InterviewTab with Voice Mode

**Modified file:** `src/components/brain/InterviewTab.tsx`

Changes:
- Add a "Voice Call" button alongside the existing "Start Interview" button
- New `voiceMode` state that switches the UI from chat to a voice call interface
- Voice call UI shows:
  - Connection status (connecting / connected / disconnected)
  - Speaking indicator (agent speaking vs listening)
  - Audio level visualization (simple pulsing circle)
  - "End Call" button
- Uses `useConversation` hook from `@elevenlabs/react`:
  - Fetches token from the edge function before starting
  - Requests microphone permission with clear UX explanation
  - Uses WebRTC connection for low latency
- `onMessage` callback captures `user_transcript` and `agent_response` events to build a transcript array
- When the call ends, the transcript is converted to the existing `Message[]` format and saved to `brain_interviews` — making it available for the existing "Extract to Brain" flow
- Existing text chat remains fully functional — voice is an alternative mode, not a replacement

### Step 6: Register Edge Function

**Modified file:** `supabase/config.toml`

```toml
[functions.elevenlabs-conversation-token]
verify_jwt = false
```

---

## User Experience Flow

```text
InterviewTab
├── [No conversation active]
│   ├── "Start Interview" → text chat (existing)
│   └── "Voice Call" → voice mode (new)
│
├── [Voice mode active]
│   ├── Pulsing indicator shows agent speaking/listening
│   ├── Live transcript scrolls below
│   └── "End Call" → saves transcript → can Extract to Brain
│
└── [Previous interviews]
    └── Voice interviews show as transcripts (same card UI)
```

## Files Summary

| File | Action |
|---|---|
| ElevenLabs connector | Connect |
| `ELEVENLABS_AGENT_ID` secret | Add |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Create |
| `supabase/config.toml` | Add function entry |
| `src/components/brain/InterviewTab.tsx` | Add voice call mode |
| `package.json` | Add `@elevenlabs/react` |

## Cost Estimate

~$0.50–$1.20 per 15-minute voice interview (billed by minute via ElevenLabs).

