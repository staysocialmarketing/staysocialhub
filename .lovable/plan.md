

# Fix: Slow Down Interview Pacing

## Problem
The AI asks multiple questions at once or gives long responses before asking a question, making it overwhelming — especially in the website discovery interview.

## Solution
Strengthen the "one question at a time" instruction in all template prompts and add explicit pacing rules.

### `supabase/functions/ai-interview/index.ts`

Add a shared pacing block to every template prompt:

```
PACING RULES (critical):
- Ask exactly ONE question per response. Never two.
- Keep your response to 1-2 short sentences of acknowledgment, then your single question.
- Do NOT list multiple things to answer. One topic, one question.
- Wait for their full answer before moving to the next topic.
- Never rush — let the conversation breathe.
```

Apply to all 5 templates (`full_onboarding`, `brand_voice`, `audience`, `content_strategy`, `website_discovery`).

Also fix the `full_onboarding` and `website_discovery` FIRST message instructions — currently they ask multiple things ("what they do, how they got started, and what inspired them" / "do they have one already, what platform is it on, and what's working or not working"). Change these to a single opening question each.

| File | Change |
|---|---|
| `supabase/functions/ai-interview/index.ts` | Add pacing rules to all 5 template prompts; simplify first-message instructions to single questions |

