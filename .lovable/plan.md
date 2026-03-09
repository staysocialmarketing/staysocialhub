

# Workflow Filters System

## Summary
Add a unified filter bar with Client, Type, Assigned To, Priority, and Due Date filters across Workflow, Requests, and Tasks pages. All filtering is client-side. Active filters display as removable chips. Session-level persistence via `sessionStorage`.

## Approach
Create a shared `FilterBar` component used by all three pages. Each page passes its relevant filter options. Filters are applied client-side to already-fetched data.

## New Component: `src/components/FilterBar.tsx`

Reusable filter bar with:
- Configurable filter dropdowns (each page picks which filters to show)
- Active filter chips with × remove buttons
- Session storage persistence keyed by page name
- Filter types: `client`, `contentType`, `requestType`, `assignee`, `priority`, `dueDate`

Due date options: All, Due Today, Due This Week, Overdue

Priority options: All, Low, Normal, High, Urgent

## Page Changes

### `src/pages/Workflow.tsx`
- Replace single `contentTypeFilter` select with `FilterBar`
- Add filters: Client, Content Type, Assigned To, Priority, Due Date
- Apply all filters to `posts` array client-side (already fetched)
- Use `useClientFilter` global client filter as base, local filters layer on top

### `src/pages/Requests.tsx`
- Replace single `typeFilter` select with `FilterBar`
- Add filters: Client (admin only), Request Type, Assigned To, Priority, Status
- Apply filters client-side to `requests` array

### `src/pages/team/Tasks.tsx`
- Replace current project/assignee selects with `FilterBar`
- Add filters: Client, Project, Assigned To, Priority, Due Date
- Keep server-side assignee filtering (already works), add client-side for priority/due date

## FilterBar Component Design

```
┌─────────────────────────────────────────────────────┐
│ [Client ▾] [Type ▾] [Assigned ▾] [Priority ▾] [Due ▾] │
│                                                       │
│ Client: Premiere ×   Type: Social Post ×              │
└─────────────────────────────────────────────────────┘
```

- Each dropdown defaults to "All"
- Active (non-"all") filters render as small outline badges with × button
- `sessionStorage` key: `hub-filters-{pageName}`

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `src/components/FilterBar.tsx` | Shared filter bar with chips + session persistence |
| Edit | `src/pages/Workflow.tsx` | Replace content type filter with full FilterBar |
| Edit | `src/pages/Requests.tsx` | Replace type filter with FilterBar |
| Edit | `src/pages/team/Tasks.tsx` | Replace project/assignee filters with FilterBar |

## No Database Changes
All filtering is client-side on already-fetched data. No schema changes needed.

