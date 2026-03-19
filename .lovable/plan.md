

# Phase 4: Secondary Pages Redesign

Applying the Pressmaster-style treatment to all remaining pages, informed by the 3-layer strategy (Internal OS / Client Portal / DIY Platform).

## Overview

14 pages to redesign across 4 batches. All changes are cosmetic — no logic or data changes. Client information and functionality is preserved as-is.

---

## Batch A: Team Workspace (Layer 1 — Internal OS)

### Tasks (`src/pages/team/Tasks.tsx` — 321 lines)
- Replace bordered cards with `card-elevated` containers and `divide-y` list rows
- Bolder page title + count badge, simplified filter row
- Kanban columns: softer `bg-muted/30` backgrounds, uppercase labels, rounded-2xl task cards
- Priority badges use alpha-tinted colors (already defined, apply consistently)
- Assignee avatars as initials circles instead of text

### Projects (`src/pages/team/Projects.tsx` — 656 lines)
- Accordion-style project rows inside a single `card-elevated` container
- Project header: bold name, status badge, task progress bar (X/Y complete)
- Nested tasks as compact list rows with `hover:bg-muted/30`
- Create dialog: borderless `shadow-float` style
- Status filter as pill toggles instead of select dropdown

### Think Tank (`src/pages/team/ThinkTank.tsx` — 528 lines)
- Grid of `card-elevated` idea cards (2-col on md, 3-col on lg)
- Type icon + tinted background per type (idea=amber, meeting_note=blue, brainstorm=purple)
- Action buttons (→ Request, → Project, → Task) as ghost icon buttons on hover
- Filter row: pill toggles for type, status as toggle group
- AI/Strategy panels keep existing behavior, just restyle containers

---

## Batch B: Calendar & Content (Shared Layer 1+2)

### Marketing Calendar (`src/pages/MarketingCalendar.tsx` — 443 lines)
- Calendar grid: remove cell borders, use subtle `bg-muted/20` for alternate rows
- Day cells: rounded-xl, today highlighted with primary ring
- Post dots inside cells: larger, color-coded by platform
- List/Board views: apply same `card-elevated` + `divide-y` pattern
- View toggle (Calendar/List/Board) as rounded pill group

### Content Library (`src/pages/ContentLibrary.tsx` — 349 lines)
- Media grid: `rounded-2xl overflow-hidden` with `shadow-soft` on hover
- Upload dialog: cleaner drag-drop zone with dashed border
- Tab triggers: pill-style rounded toggles
- Search: full-width with subtle background, no border
- Voice notes section: compact player rows

### Admin Media (`src/pages/admin/AdminMedia.tsx` — 471 lines)
- Same media grid treatment as Content Library
- Edit dialog: borderless `shadow-float`
- Filter/search bar: integrated single row, pill-style type filters

---

## Batch C: Client-Facing Pages (Layer 2 — Client Portal)

### Success Center (`src/pages/client/SuccessCenter.tsx` — 568 lines)
- Hero section: welcome message with client name, large and warm
- Strategy cards: `card-elevated` with icon accent, no borders
- Activity timeline: softer connector lines, rounded event dots
- Onboarding tracker: progress bar with primary fill, step cards simplified
- Quick actions (Request, Approvals, Calendar) as large tappable cards

### Profile (`src/pages/Profile.tsx` — 362 lines)
- Tab navigation: pill toggles instead of underline tabs
- Form sections: grouped in `card-elevated` blocks with section labels
- Platform checkboxes: as tinted pill toggles
- Save button: sticky bottom bar on mobile
- Pending update banner: softer yellow/amber tint

### What's New (`src/pages/WhatsNew.tsx` — 220 lines)
- Release notes: timeline layout with version badges
- Marketplace items: `card-elevated` grid with icon, description, CTA
- Recommended item: highlighted with primary border/glow

---

## Batch D: Admin Pages (Layer 1 — Internal OS)

### Admin Clients (`src/pages/admin/AdminClients.tsx` — 661 lines)
- Client cards: `card-elevated` grid with health indicator, plan badge
- Edit dialog: borderless sections with clear labels
- Linked activity tabs: pill toggles, compact list rows
- Create client: simplified single-field dialog

### Remaining Admin Pages (lighter touch — inherit foundation styles)
- `AdminUsers.tsx` — table with `rounded-2xl` container, softer row hovers
- `AdminContent.tsx` — list rows with `divide-y` pattern
- `AdminProfileUpdates.tsx` — card list with status badges
- `AdminMarketplace.tsx` — grid cards with icon + description
- `AdminVersions.tsx` — timeline/list with version badges
- `TeamDashboard.tsx`, `TeamRoles.tsx`, `TeamRevenue.tsx`, `TeamGrowth.tsx`, `TeamWins.tsx` — apply `card-elevated` to stat cards, softer table styles

### Auth Page (`src/pages/Auth.tsx` — 175 lines)
- Keep space/dark theme but apply new border-radius and shadow tokens
- Input fields: `rounded-xl`, more padding
- Buttons: match new button styles with `active:scale` effect
- Logo and typography: use DM Sans, bolder heading

---

## Technical Approach

- All changes are CSS/className updates only — no logic, state, or data changes
- Existing client data, filters, and functionality fully preserved
- Consistent use of design tokens from Phase 1 (`card-elevated`, `shadow-soft`, `rounded-2xl`, `divide-y`)
- Implementation order: Batch A → B → C → D (one batch per message)

