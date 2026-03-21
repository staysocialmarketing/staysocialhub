

# Fix Voice Agent: Actions Not Created + Personalized Greeting + Background Processing

## Root Causes

### 1. Requests never created
The `execute_actions` mode works (verified via curl), but the voice transcript doesn't include a client name, and Corey (SS user) has no `client_id` on their profile. The extraction AI returns `client_name` only if the user mentions it by name during the call. Without it, `executeTool` returns `"No client selected"` — and this error gets swallowed in the results. The confirmation card doesn't show which client the action is for, and there's no way to add one before confirming.

### 2. No feedback after closing
The `handleOpen` blocks closure during extraction, but if the user navigates away or the drawer closes for any reason, the extraction promise is lost. No toast or notification is sent on completion.

### 3. Generic greeting
The `first_message` and `welcomeMessage` say "Hey!" with no personalization. The user's name is available in `profile.name` on the client and can be resolved server-side.

## Plan

### 1. Require Client Selection on Confirmation Card

**File:** `src/components/GlobalCaptureButton.tsx`

- Add a `confirmClientId` state that defaults to the capture button's `clientId` (if SS had one selected) or the profile's `client_id` (if client user)
- On the confirmation view, if any proposed action lacks a `client_name` and the user is SS role, show a `ClientSelectWithCreate` picker at the top of the card with label "Which client is this for?"
- Disable "Confirm All" until a client is selected
- When executing, pass the selected `confirmClientId` as `client_name` override in each action's args (or better: pass a separate `client_id` field that `execute_actions` uses directly)

**File:** `supabase/functions/hub-assistant/index.ts`
- In `execute_actions` mode, accept an optional top-level `client_id` override that applies to all actions missing a `client_name`
- This avoids needing the AI to resolve names again

### 2. Personalized Greeting

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`
- After resolving user profile, also fetch `name` from the `users` table
- Extract first name: `name.split(" ")[0]`
- Update `buildFirstMessage` to accept `userName` and use it: `"Hey Corey! Want to create a task or look up what's on the board?"`
- Update `buildVoiceSystemPrompt` to include: `"The user's name is ${firstName}. Address them by name occasionally to keep things personal."`
- Add personality note: `"Be warm, relaxed, and slightly casual — like a friendly coworker."`

**File:** `src/components/GlobalCaptureButton.tsx`
- Update `welcomeMessage` to use `profile?.name`: `"Hey ${firstName}! I can help you **create requests**..."`
- For client users, optionally fetch brand voice tone from `brand_twin` to match their brand personality (Phase 2 — skip for now, just use first name)

### 3. Background Processing with Persistent Toast + Notification

**File:** `src/components/GlobalCaptureButton.tsx`

- Move the `handleVoiceCallEnd` extraction logic into a ref-stable function that doesn't depend on component mount state
- Use `toast.loading()` (Sonner supports persistent loading toasts) that updates to `toast.success/error` on completion — this persists even if the drawer closes
- After successful execution, insert a notification into the `notifications` table via the `hub-assistant` edge function (server-side, using service role)
- Allow the drawer to close during extraction (remove the block) but show the persistent toast

**File:** `supabase/functions/hub-assistant/index.ts`
- In `execute_actions` response, if all succeeded, also insert a notification for the user: `"Hub Assistant created: [summary]"` with link to `/requests`

### 4. "Connecting" State Improvement

**File:** `src/components/GlobalCaptureButton.tsx`
- The voice call view currently shows "Connecting..." with no timeout feedback
- Add elapsed time to connecting state: `"Connecting... (3s)"`
- If connecting takes >10s, show a fallback message: `"Taking longer than usual — try closing and reopening"`

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Personalized first message + greeting with user's name |
| `supabase/functions/hub-assistant/index.ts` | Accept `client_id` override in `execute_actions`, insert notification on success |
| `src/components/GlobalCaptureButton.tsx` | Client picker on confirmation, persistent toast, personalized welcome, connecting timeout |

No database changes needed.

