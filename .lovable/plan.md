

# Global Search System

## Summary
Add a command-palette-style global search (Cmd+K / Ctrl+K) to the HUB header, visible only to SS roles. Uses the existing `cmdk` library and `CommandDialog` component. Searches across clients, requests, tasks, media (posts), strategy, and Think Tank items with debounced queries and grouped results.

## Approach
Use the already-installed `cmdk` package and the existing `CommandDialog` UI component. Create a new `GlobalSearch` component that:
- Renders a search trigger button in the header (search icon + "Search..." text + keyboard shortcut hint)
- Opens a `CommandDialog` with grouped results
- Queries 6 tables on debounced input (300ms)
- Groups results by category with icons
- Navigates on selection

## New File: `src/components/GlobalSearch.tsx`
- State: `open`, `query` (debounced), results per category
- Keyboard shortcut: Cmd+K / Ctrl+K to toggle
- On query change (debounced 300ms), run parallel queries:
  - `clients` → name ilike `%query%`, limit 5
  - `requests` → topic ilike, limit 5
  - `tasks` → title ilike, limit 5
  - `posts` → title ilike, limit 5 (media)
  - `client_strategy` → join clients for name, limit 5
  - `think_tank_items` → title ilike, limit 5
- Results grouped in `CommandGroup` sections with category icons
- Each `CommandItem` navigates: clients→`/admin/clients`, requests→`/requests`, tasks→`/team/tasks`, media→`/admin/media`, strategy→`/admin/client-strategy/:id`, think tank→`/team/think-tank`
- Only rendered when `isSSRole` is true

## Edit: `src/components/AppLayout.tsx`
- Import and render `<GlobalSearch />` in the header, between the title area and NotificationBell
- Only show when `isSSRole` is true

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `src/components/GlobalSearch.tsx` | Command palette search component |
| Edit | `src/components/AppLayout.tsx` | Add GlobalSearch to header |

