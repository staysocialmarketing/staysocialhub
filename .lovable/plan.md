

# Client Profile + Strategy System

## Overview

Expand the existing `client_profile` JSONB columns with richer fields and add a new `client_strategy` table for internal-only planning data. Create an admin/team Strategy page per client, and update the client-facing My Profile page with the expanded fields.

## Database Changes

### New table: `client_strategy`
Internal strategy data per client, one row per client.

| Column | Type | Default |
|--------|------|---------|
| `client_id` | uuid PK | — |
| `goals_json` | jsonb | `'{}'` |
| `focus_json` | jsonb | `'{}'` |
| `pillars_json` | jsonb | `'[]'` |
| `campaigns_json` | jsonb | `'[]'` |
| `studio_notes_json` | jsonb | `'{}'` |
| `updated_at` | timestamptz | `now()` |

RLS: SS roles full CRUD. Clients cannot see this table.

No changes to `client_profile` schema — the existing JSONB columns already accommodate the new fields (service_regions, industry, UVP, social_profiles, etc.) by just storing more keys in the JSON.

## UI Changes

### 1. Expand `src/pages/Profile.tsx` (Client-facing "My Profile")
Add new fields to existing JSONB sections:
- **Business Info tab**: Add `service_regions`, `industry`, `contact_person` fields
- **Brand Voice tab**: Add `tone`, `communication_style`, `messaging_guidance`, `cta_style` (rename existing fields for clarity)
- **New "Links" section** within Business Info: `social_profiles`, `booking_link` (booking_link already exists, add social profiles)
- **Offers tab**: Add `unique_value_proposition` field

### 2. New page: `src/pages/admin/ClientStrategy.tsx`
Admin/Team page for internal strategy planning per client. Accessed via `/admin/client-strategy/:clientId`.

Sections (each a card with editable text areas for admin, read-only for team):
- **Goals**: Client marketing objectives
- **Current Focus**: Editable weekly focus box
- **Content Pillars**: Key themes list (add/remove items)
- **Campaign Notes**: Current marketing campaigns (rich text area)
- **Studio / AI Notes**: Video content instructions, AI Persona tone, scripting guidance

Uses a client selector at the top (or receives clientId from URL param).

### 3. Update `src/pages/admin/AdminClients.tsx`
Add a "Strategy" button/link on each client card that navigates to `/admin/client-strategy/:clientId`.

### 4. Update routing + nav
- **`src/App.tsx`**: Add route `/admin/client-strategy/:clientId` → `ClientStrategy` (AdminRoute wrapped)
- **`src/components/AppSidebar.tsx`**: No new top-level nav item needed — strategy is accessed per-client from the Clients page

## Permissions
- **Team (SS roles)**: Full access to Strategy page (read for ss_team, write for ss_admin)
- **Clients**: Can edit their My Profile fields via the existing submit-for-review flow. Cannot see Strategy.

## Files Summary

| Action | File |
|--------|------|
| Migration | 1 SQL: `client_strategy` table + RLS |
| New | `src/pages/admin/ClientStrategy.tsx` |
| Edit | `src/pages/Profile.tsx` (expanded fields) |
| Edit | `src/pages/admin/AdminClients.tsx` (strategy link) |
| Edit | `src/App.tsx` (new route) |

