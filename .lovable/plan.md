

# Fix Voice Agent: Request Not Created + Slow Processing

## Root Cause Analysis

**Why the request wasn't created:** When you (SS role) use the voice agent, the `execute_actions` mode calls `executeTool("create_request", ...)` with `clientId` pulled from your user profile. SS users don't have a `client_id` on their profile — it's `null`. The function checks `if (!targetClientId)` and returns `{ error: "No client selected" }`. The error gets swallowed into the results array but the UI just shows "1 action completed" vs "1 action failed" without enough detail.

The voice agent likely extracted the right intent ("create a test post for Tristan") but had no way to resolve a client name to a `client_id` during execution. The `create_request` tool also has no `assigned_to` parameter, so "assigned to Tristan" was lost.

**Why it was slow:** The `extract_actions` call sends the full transcript to Lovable AI for tool-calling extraction — a cold Gemini call that can take 5-10s. Combined with the ElevenLabs disconnect handshake, total processing is 8-15s.

## Plan

### 1. Fix: Resolve Client by Name for SS Users (the actual bug)

**File:** `supabase/functions/hub-assistant/index.ts` — `executeTool()`

- When `clientId` is null (SS user) and the tool is `create_request` or `capture_idea`, check if `args` contains a `client_name` field
- If so, look up `clients` table by `ilike("name", ...)` and resolve to an ID
- Add `client_name` as an optional parameter to the `create_request` and `capture_idea` tool definitions so the AI can pass it

Also add `assigned_to_name` as an optional param on `create_request` so the AI can capture assignment intent. Resolve name → user ID in `executeTool`.

### 2. Fix: Better Error Visibility on Confirmation Card

**File:** `src/components/GlobalCaptureButton.tsx`

- After `executeActions`, if any result has `.error`, show the specific error message in a toast (not just "X actions failed")
- On the confirmation card, show resolved client name if available, or a warning if no client was specified

### 3. Speed: Use Faster Model for Extraction

**File:** `supabase/functions/hub-assistant/index.ts` — `extract_actions` mode

- Switch from `google/gemini-3-flash-preview` to `google/gemini-2.5-flash-lite` for the extraction call — it's a simple structured extraction task that doesn't need the heavier model
- This should cut extraction time roughly in half

### 4. UX: Better Processing Feedback

**File:** `src/components/GlobalCaptureButton.tsx`

- Add a third processing step message: "Almost done..." after 5 seconds of extraction
- Show elapsed time indicator (e.g., "Extracting actions... (8s)") so the user knows it's still working
- After execution completes, show a detailed toast: "Created request: 'Test post' for [Client]" instead of generic "1 action completed"

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Add `client_name` + `assigned_to_name` params to tools, resolve in `executeTool`, use faster model for extraction |
| `src/components/GlobalCaptureButton.tsx` | Better error toasts, elapsed time indicator, detailed success messages |

No database changes needed.

