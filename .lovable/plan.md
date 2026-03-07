

# Sidebar Section Grouping

## Change: `src/components/AppSidebar.tsx`

Replace the current flat menu lists with grouped sections using `SidebarGroupLabel` for visual separation.

### Admin/Team sidebar sections:

**Menu** — Dashboard, Workflow, Approvals, Requests

**Team** — Projects, Tasks, Think Tank

**Admin** — Clients, Media Library, Marketplace, Users (Users visible to admin only)

### Client sidebar
Remains unchanged (flat list): Dashboard, Approvals, Requests, My Media, My Profile, My Plan, What's New

### Implementation
- Define three item arrays: `menuSection`, `teamSection`, `adminSection`
- Render each as a separate `SidebarGroup` with a `SidebarGroupLabel`
- For team role users, the Admin section excludes "Users"
- Group labels hidden when sidebar is collapsed
- Separators between groups for visual clarity

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Replace flat nav with 3 labeled sections for admin/team views |

No other files changed. No database changes.

