

# Personalized Welcome Messages per Interview Template

## Problem
When clicking "Text Interview", `streamChat([])` sends an empty message array to the AI. The system prompt varies per template, but the AI's opening greeting ends up sounding similar across all templates because there's no explicit instruction for **how to open the conversation**.

## Solution
Add a short opening instruction as the first user message (hidden from UI) that primes the AI to greet the client with a template-specific welcome. This gives each interview type a distinct, personalized start.

## Changes

### `src/components/brain/InterviewTab.tsx`
Instead of calling `streamChat([])` with no messages, send a hidden "primer" message per template:

```text
full_onboarding → "Start the comprehensive brand onboarding interview. Introduce yourself warmly and ask about their business story."
brand_voice     → "Start the brand voice deep dive. Introduce yourself and ask about how they naturally communicate."
audience        → "Start the audience research session. Introduce yourself and ask who their ideal customers are."
content_strategy → "Start the content strategy session. Introduce yourself and ask about their current platforms and content approach."
website_discovery → "Start the website discovery session. Introduce yourself and ask about their current website situation."
```

- Define a `TEMPLATE_OPENERS` map with these primer messages
- On "Text Interview" click, call `streamChat([{ role: "user", content: opener }])` but **do not** add this primer to the visible `messages` state — only pass it to the API call
- Alternatively (simpler): append the opener instruction directly to the system prompt in the edge function as a "Begin by..." line

**Recommended approach**: Add the opening instruction to the system prompts in the edge function — this is cleaner since the system prompts already exist per template and it requires no frontend changes.

### `supabase/functions/ai-interview/index.ts`
Append a clear opening instruction to each template's system prompt:

- `full_onboarding`: already has "Start with warm introductions and ask about their business story" — just make it more explicit: "Your FIRST message should warmly introduce yourself as a brand strategist from Stay Social and ask about their business story and what inspired them to start."
- `brand_voice`: "Your FIRST message should introduce yourself as a brand voice specialist and ask how they'd describe the way they naturally talk about their business."
- `audience`: "Your FIRST message should introduce yourself as an audience research specialist and ask them to describe their ideal customer."
- `content_strategy`: "Your FIRST message should introduce yourself as a content strategy consultant and ask what platforms they're currently using."
- `website_discovery`: "Your FIRST message should introduce yourself as a website strategist from Stay Social and ask about their current website situation — do they have one, what's working, what's not."

| File | Change |
|---|---|
| `supabase/functions/ai-interview/index.ts` | Add explicit first-message instructions to each template prompt |

