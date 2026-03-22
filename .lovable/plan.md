

# Navigation Reorganization + Corporate Strategy Section

## Current State Assessment

### Navigation (all 3 surfaces: sidebar, mobile menu, bottom tabs)

**Current Internal (Admin/Team) layout:**
- Menu: Dashboard, Workflow, Calendar, Approvals, Requests
- Team: Inbox, Projects, Tasks, Think Tank
- Admin: Clients, Marketplace, Users, Team, Automations, Meeting Notes, Versions

**Problems identified:**
- "Automations" is visible to all SS roles but should be admin-only (it's also non-functional — the table/UI exist but no database triggers invoke the edge function, so rules never fire)
- "Team" appears twice (as a nav group AND an admin sub-page)
- No "Tools" section for internal users (Content Generator is buried in the mobile menu only)
- No corporate/blanket strategy area
- Meeting Notes is admin-only but could be useful to team

### Automations Status
The feature has a complete UI and edge function, but **no database triggers** are wired up via `pg_net` to invoke `process-automation-rules` when records change. It's essentially a shell — rules can be created and toggled but never execute.

---

## Proposed Navigation Structure

### Internal Users (SS Admin)

```text
MENU
  Dashboard
  Workflow
  Calendar
  Approvals
  Requests

TEAM
  Inbox
  Projects
  Tasks
  Think Tank

CORPORATE            ← NEW section
  Strategy Playbook  ← blanket strategies, design prompts, SOPs
  Content Generator

ADMIN                ← ss_admin only
  Clients
  Team Management    ← renamed from "Team" to avoid confusion
  Users
  Marketplace
  Meeting Notes
  Automations        ← moved here, admin-only, with note it's WIP
  Versions
```

### Internal Users (SS Team — non-admin)

```text
MENU
  Dashboard
  Workflow
  Calendar
  Requests

TEAM
  Inbox
  Projects
  Tasks
  Think Tank

CORPORATE
  Strategy Playbook
  Content Generator
```

No Admin section visible at all for team members.

### Client Users (unchanged)

```text
MY CONTENT
  Dashboard
  Success Center
  Approvals
  Calendar
  Requests
  My Media
  My Plan

AI TOOLS
  AI Interview
  Content Generator
  Brand Twin

ACCOUNT
  My Profile
  What's New
```

---

## Implementation Plan

### 1. Create Corporate Strategy page (`src/pages/admin/CorporateStrategy.tsx`)
- A new page at `/corporate/strategy` for blanket strategies and reusable templates
- Contains sections for: Design Prompt Templates, Content SOPs, Brand Guidelines
- Backed by a new `corporate_strategies` table with fields: `id`, `title`, `category` (design_prompt, sop, guideline), `content` (text), `created_by_user_id`, `created_at`, `updated_at`
- RLS: SS roles can read, SS admin can manage
- Each strategy item is a card with title, category badge, and expandable content
- Admin can create/edit/delete; team can view

### 2. Database migration
- Create `corporate_strategies` table
- RLS policies for SS read / SS admin manage
- No triggers needed for now

### 3. Update navigation (3 files)
**`src/components/AppSidebar.tsx`**:
- Add "Corporate" section with Strategy Playbook + Content Generator
- Rename admin "Team" to "Team Management"
- Remove Automations from team-visible admin items (keep for admin only)
- Remove Content Generator from mobile-only tools section

**`src/components/MobileMenu.tsx`**:
- Mirror the same structure: add Corporate section, restrict Admin to ss_admin only
- Remove separate "Tools" section (merged into Corporate)

**`src/components/BottomTabBar.tsx`**: No change (tabs stay: Dashboard, Approvals, Requests, Calendar, More)

### 4. Add route in `src/App.tsx`
- `/corporate/strategy` → `AdminRoute` wrapped `CorporateStrategy`

### 5. Automations note
Automations will remain in the Admin section (admin-only). No database trigger wiring in this pass — we can revisit when ready to activate it.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/admin/CorporateStrategy.tsx` | New page for blanket strategies |
| `src/components/AppSidebar.tsx` | Reorganize nav: add Corporate, restrict Admin, rename Team |
| `src/components/MobileMenu.tsx` | Mirror new nav structure |
| `src/App.tsx` | Add `/corporate/strategy` route |
| Migration SQL | Create `corporate_strategies` table with RLS |

