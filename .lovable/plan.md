

# Fix: Personalized Interview Openings (Text + Voice)

## Root Causes

1. **Text mode**: `streamChat([])` sends an empty messages array. The system prompt says "Your FIRST message should..." but with zero user messages, models often ignore this instruction.
2. **Voice mode**: `VoiceCallPanel` sends no body to the token endpoint (no `include_prompt`, no `interview_template`), so it gets the generic Hub Assistant prompt. It also doesn't pass `overrides` to `startSession`.

## Changes

### 1. `src/components/brain/InterviewTab.tsx` — Hidden primer for text mode

Add a `TEMPLATE_OPENERS` map. When "Text Interview" is clicked, call `streamChat([{ role: "user", content: opener }])` instead of `streamChat([])`. The primer message is NOT added to visible `messages` state — it's only passed to the API.

```typescript
const TEMPLATE_OPENERS: Record<string, string> = {
  full_onboarding: "Start the comprehensive brand onboarding interview. Introduce yourself warmly and ask about their business story.",
  brand_voice: "Start the brand voice deep dive. Introduce yourself and ask about how they naturally communicate.",
  audience: "Start the audience research session. Introduce yourself and ask who their ideal customers are.",
  content_strategy: "Start the content strategy session. Introduce yourself and ask about their current platforms and content approach.",
  website_discovery: "Start the website discovery session. Introduce yourself and ask about their current website situation.",
};
```

Line ~720: Change `streamChat([])` → `streamChat([{ role: "user", content: TEMPLATE_OPENERS[template] || "Start the interview." }])`

### 2. `src/components/brain/VoiceCallPanel.tsx` — Pass template context + use overrides

- Send `{ include_prompt: true, interview_template: template }` in the POST body to the token endpoint
- Use the returned `prompt` and `first_message` as overrides in `startSession`:

```typescript
await conversation.startSession({
  signedUrl: signed_url,
  overrides: {
    agent: {
      prompt: { prompt: promptText },
      firstMessage: first_message,
    },
  },
});
```

### 3. `supabase/functions/elevenlabs-conversation-token/index.ts` — Interview-aware voice prompts

Accept optional `interview_template` in the request body. When present, build a voice-optimized system prompt and first message from the interview template (shorter versions of the text-mode prompts) instead of the Hub Assistant prompt.

Add a function like `buildInterviewVoicePrompt(template, clientName, userName)` that returns `{ prompt, first_message }` per template.

## ElevenLabs Dashboard

Already confirmed: "First message" and "System prompt" overrides are ON (per screenshot). No further dashboard changes needed.

## Summary

| File | Change |
|---|---|
| `src/components/brain/InterviewTab.tsx` | Send hidden primer message for text mode instead of empty array |
| `src/components/brain/VoiceCallPanel.tsx` | Send template to token endpoint; use prompt/firstMessage overrides |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Build interview-specific voice prompts when `interview_template` is provided |

