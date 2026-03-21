

# Optimize Voice Startup + Page-Aware Assistant Context

## Three Changes

### 1. Combine Signed URL + Voice Prompt Into One Call

Currently `startVoiceCall()` makes two sequential requests (token + prompt), causing 2-4s delay. Merge them by having the `elevenlabs-conversation-token` edge function also accept an optional `include_prompt` flag and return the voice prompt alongside the signed URL.

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`
- Accept optional `{ include_prompt: true, current_route: "/requests" }` in request body
- When `include_prompt` is true: look up user profile/role (same pattern as hub-assistant), call `buildVoiceSystemPrompt()` (extracted to a shared inline function), and return `{ signed_url, prompt, first_message }` in one response
- This cuts startup from 2 sequential calls to 1

**File:** `src/components/GlobalCaptureButton.tsx`
- Update `startVoiceCall()` to send `{ include_prompt: true, current_route: location.pathname }` to the token endpoint
- Remove the second fetch to `hub-assistant` with `mode: "get_voice_prompt"`
- Use `useLocation()` from react-router-dom to get current route

### 2. Page-Aware Context for Both Text and Voice

Pass the current route to the assistant so it adapts its greeting and capabilities.

**Route-to-context mapping** (in edge function):

| Route pattern | Context hint added to system prompt |
|---|---|
| `/requests` | "The user is viewing content requests. You can help create new ones or discuss existing ones." |
| `/approvals` | "The user is viewing the approvals board. Help with content review questions." |
| `/workflow` | "The user is on the workflow board. Help with content pipeline questions." |
| `/team/tasks` | "The user is viewing tasks. Help query or create tasks." |
| `/team/projects` | "The user is viewing projects." |
| `/dashboard` | "The user is on the dashboard." |
| `/client/success` | "The user is on their Success Center." |
| default | (no extra context) |

**Dynamic first message examples:**
- SS on `/requests`: "Hey! Need to create a new request or check on existing ones?"
- Client on `/client/success`: "Hi! Want to submit a content idea or have a question about your plan?"
- Default: "Hey! What can I help you with?"

**File:** `supabase/functions/hub-assistant/index.ts`
- Accept optional `current_route` in the chat mode request body
- Append route context to system prompt
- Update `get_voice_prompt` mode to also accept and use `current_route`

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`
- When building the prompt, use the `current_route` to pick contextual first message and prompt additions

**File:** `src/components/GlobalCaptureButton.tsx`
- Pass `current_route: location.pathname` in both text chat requests and voice call setup
- Use route-aware `first_message` from server response (fall back to generic greeting)

### 3. Page-Aware Welcome in Text Chat

**File:** `src/components/GlobalCaptureButton.tsx`
- Update the static welcome message in the assistant chat to also reflect the current page
- Fetch a short welcome hint based on route (client-side mapping is fine here since it's just UI copy, not security)

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Add prompt generation, accept `include_prompt` + `current_route` |
| `supabase/functions/hub-assistant/index.ts` | Accept `current_route`, append page context to system prompt |
| `src/components/GlobalCaptureButton.tsx` | Single call for voice setup, pass route context, dynamic welcome |

No database changes needed.

