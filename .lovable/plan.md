

# Refine UX Architecture: Quick Capture + Command/Action Layer

## What This Changes

Transform the existing `GlobalSearch` (Cmd+K) from a search-only tool into a full **Command Palette** that serves as the "control/power-user/AI" layer, while keeping the `+` FAB unchanged as the "input/capture" layer.

No visual redesign. Same layouts, cards, spacing, navigation. This is a system connection and interaction architecture update.

## Interaction Model

```text
┌─────────────────────────────────────┐
│  + FAB (Quick Capture)              │  = Add something new quickly
│  ─ Capture Idea → Think Tank        │
│  ─ Create Request → Request         │
│  ─ Add Task → Task                  │
│  ─ Upload Image → Media/Inbox       │
│  ─ Voice Note → Media/Inbox         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ⌘K Command Palette                │  = Find, navigate, trigger actions, AI
│  ─ Search: clients, requests, etc.  │
│  ─ Navigate: open approvals, cal    │
│  ─ Actions: create request, task    │
│  ─ Future: AI generate, summarize   │
└─────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/GlobalSearch.tsx` | Rewrite into `CommandPalette.tsx` — add navigation shortcuts, action commands, and empty-state quick actions alongside existing search |
| `src/components/AppLayout.tsx` | Swap `GlobalSearch` for `CommandPalette`, make ⌘K available to all roles (not just SS) |

## Detailed Changes

### `src/components/GlobalSearch.tsx` → `src/components/CommandPalette.tsx`

Expand the existing command dialog to include three command groups when the search query is empty:

**1. Quick Navigation (always visible when query is empty)**
Static list of navigation shortcuts filtered by role:
- SS roles: Dashboard, Workflow, Calendar, Approvals, Requests, Inbox, Tasks, Projects, Think Tank, Clients, Media, Team
- Clients: Dashboard, Success Center, Approvals, Requests, My Media, Profile, Plan

Each item uses `navigate()` on select, same as current search results.

**2. Actions (always visible when query is empty)**
These trigger the same flows that already exist in the app — they open dialogs or navigate:
- "Create Request" → opens `MakeRequestDialog` (same as + button)
- "Create Task" → navigates to `/team/tasks` (SS only)
- "Capture Idea" → navigates to `/team/think-tank` (SS only)
- "Upload Media" → navigates to `/admin/media` (SS only)
- "View Approvals" → navigates to `/approvals`
- "Open Content Calendar" → navigates to `/calendar` (SS only)

**3. Future AI Actions (visible but disabled/placeholder)**
Show a greyed-out "AI Actions" group with items like:
- "Generate strategy…" (coming soon)
- "Generate draft…" (coming soon)
- "Summarize approvals…" (coming soon)

These render with a `disabled` state and a subtle "Coming soon" badge. No functionality yet — just establishes the pattern for future AI integration.

**4. Search results (visible when query is typed)**
Keep existing search behavior exactly as-is — clients, requests, tasks, media, strategy, think tank.

### `src/components/AppLayout.tsx`

- Replace `<GlobalSearch />` import/usage with `<CommandPalette />`
- Remove the `{isSSRole && ...}` gate — make the command palette available to all authenticated users (clients get navigation + search for their accessible data; action items are role-filtered inside the component)
- The header trigger button text changes from "Search…" to "Search & Commands…" with same ⌘K shortcut

### Quick Capture (`GlobalCaptureButton.tsx`)

**No changes.** The + button stays exactly as it is. Same options, same forms, same destinations. The only conceptual change is that the command palette can also trigger "Create Request" — this is intentional overlap since both layers should support the most common action, but through different interaction patterns (quick form vs. command search).

