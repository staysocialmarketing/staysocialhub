

# Hub Assistant Enhancements + Sidebar Dropdown Menus

## Three Issues to Address

### 1. Hub Assistant: Role-Based Tool Filtering

The edge function currently gives all users the same two tools (`create_request`, `capture_idea`). Need to differentiate:

**SS Admin/Team tools** (Phase 1 additions):
- `create_request` — existing
- `capture_idea` — existing  
- `query_tasks` — search/list tasks by client, status, assignee
- `query_projects` — search/list projects by client, status

**Client tools** (restricted):
- `create_request` — scoped to their client only
- `capture_idea` — scoped to their client only
- No access to tasks, projects, or internal data

**File:** `supabase/functions/hub-assistant/index.ts`
- Add `query_tasks` and `query_projects` tools (SELECT only, read-safe)
- Conditionally include tools based on `isSSRole`
- Update system prompt to reflect available capabilities per role
- Client system prompt explicitly states: "You do NOT have access to internal tasks, projects, or team data"

### 2. Hub Assistant: No Voice Option

Currently the assistant mode only shows a text input. Add a mic button next to the send button that records audio, transcribes it (reusing the existing `transcribe-capture` edge function), and sends the transcript as a text message to the assistant.

**File:** `src/components/GlobalCaptureButton.tsx`
- Add a `Mic` icon button next to the `Send` button in the assistant chat input area
- On click: record audio → stop → transcribe via `transcribe-capture` → insert transcript as user message → send to hub-assistant
- Reuse existing `startRecording`/`stopRecording` pattern but adapted for assistant mode
- Show recording indicator (pulsing mic) and transcribing state

### 3. Sidebar: Collapsible Section Menus

The sidebar currently shows flat lists under "Menu", "Team", "Admin" labels with no expand/collapse. Add collapsible dropdown behavior to these section groups.

**File:** `src/components/AppSidebar.tsx`
- Use the existing shadcn `Collapsible` component (already in the project)
- Wrap each `SidebarGroup` (Menu, Team, Admin for SS; main sections for clients) in a `Collapsible` with `ChevronDown` toggle on the group label
- Default all sections to expanded
- Persist collapsed state in localStorage per section

---

## Files Summary

| File | Change |
|---|---|
| `supabase/functions/hub-assistant/index.ts` | Role-based tool filtering, add query_tasks/query_projects for SS only |
| `src/components/GlobalCaptureButton.tsx` | Add voice input (mic button) to assistant chat |
| `src/components/AppSidebar.tsx` | Add collapsible section dropdowns |

