

# Hub Assistant — Phase 1 Implementation

## Overview

Add a floating AI assistant alongside the existing capture button. Users chat in natural language to create content requests or capture ideas. The assistant uses Lovable AI (Gemini) with tool-calling to execute actions server-side.

## Architecture

```text
User → HubAssistant.tsx (floating chat UI)
     → hub-assistant edge function (JWT-authenticated)
     → Lovable AI Gateway (tool-calling)
     → Supabase DB (requests, brain_captures)
```

## Security Model

- JWT validated via `getClaims()` in edge function — no anonymous access
- User role and client_id resolved server-side from the `users` and `user_roles` tables using service role client
- Client users can only create requests/captures for their own client (enforced server-side)
- SS users must specify a client — resolved by name lookup server-side
- LOVABLE_API_KEY already available as a secret
- No sensitive data exposed to client

## Changes

### 1. Edge Function: `supabase/functions/hub-assistant/index.ts`

- Validate JWT via `getClaims()`, extract `user_id`
- Fetch user profile (role, client_id) using service role client
- Build role-aware system prompt:
  - **Clients**: "You help this client capture ideas and submit content requests. Always confirm before creating."
  - **SS Team**: "You help the team create requests and captures for any client. Ask which client if not specified."
- Two tools via function-calling:
  - `create_request(topic, type, notes, priority)` — inserts into `requests` table
  - `capture_idea(content, type)` — inserts into `brain_captures` table
- Tool execution loop: AI calls tool → function executes with service role → result fed back → AI responds
- Stream response via SSE
- Handle 429/402 errors with clear messages passed to client
- Config: `verify_jwt = false` (validate in code per project pattern)

### 2. Component: `src/components/HubAssistant.tsx`

- Floating sparkles button positioned above the capture FAB (bottom-right)
- Opens a Drawer (mobile) or Dialog (desktop) with chat interface
- Messages rendered with `react-markdown`
- SSE streaming with token-by-token rendering (same pattern as InterviewTab)
- Conversation state in local memory — resets on close
- Role-appropriate welcome message
- Input validation: trim whitespace, max length check
- Error toasts for 429/402 with user-friendly messages

### 3. Layout: `src/components/AppLayout.tsx`

- Import and render `<HubAssistant />` alongside `<GlobalCaptureButton />`

### 4. Config: `supabase/config.toml`

- Add `[functions.hub-assistant]` with `verify_jwt = false`

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Create — AI agent with tool-calling |
| `supabase/config.toml` | Add hub-assistant function config |
| `src/components/HubAssistant.tsx` | Create — floating chat UI |
| `src/components/AppLayout.tsx` | Add HubAssistant component |

## What's NOT in Phase 1

- Navigation tools, search, profile updates, voice input
- Conversation persistence
- Brand Twin context in system prompt

These are natural Phase 2 additions once the core create + capture loop works.

