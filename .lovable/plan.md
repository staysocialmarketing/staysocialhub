

# Navigation Reorganization

## Changes Overview

### Internal Navigation

**Current problem**: Team members can't see Clients, Marketplace, or Team Management. These are locked behind the Admin-only gate.

**Proposed structure:**

```text
MENU
  Dashboard
  Workflow
  Calendar
  Approvals (admin only)
  Requests

TEAM
  Inbox
  Projects
  Tasks
  Think Tank

CORPORATE
  Strategy Playbook
  Content Generator

MANAGE (visible to all SS roles)
  Clients
  Team Success          ← renamed from "Team Management"
  Marketplace

ADMIN (ss_admin only)
  Users
  Meeting Notes
  Automations
  Versions
```

This gives team members access to Clients (for reference), Marketplace (for sales), and Team Success (for their own growth/roles), while keeping sensitive admin tools gated.

### Client Navigation

**Current problem**: "My Plan" and "My Profile" are in separate sections. "Account" section has only 2 items. The layout feels fragmented.

**Proposed simplified client structure:**

```text
(no section label — top level)
  Dashboard
  Success Center
  Approvals
  Calendar
  Requests
  My Media

MY ACCOUNT              ← merges Plan, Profile, What's New
  My Profile
  My Plan
  What's New

AI TOOLS
  AI Interview
  Content Generator
  Brand Twin
```

This groups all "about me / my stuff" into one **My Account** section, removing the separate "Account" label and putting Plan alongside Profile where it logically belongs. The main nav stays clean and action-focused.

## Files Changed

| File | Change |
|---|---|
| `src/components/AppSidebar.tsx` | Split admin items into "Manage" (all SS) + "Admin" (ss_admin only); rename Team Management → Team Success; restructure client sections |
| `src/components/MobileMenu.tsx` | Mirror same structure |

No database or routing changes needed — all routes already exist.

