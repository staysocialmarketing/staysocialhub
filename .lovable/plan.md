

# Stay Social Brain — Batch 1 (Foundation)

## Overview
Add an internal-only "Stay Social Brain" page per client, housing a "Brand Twin" intelligence profile. Accessible only to Admin and Team roles. No modifications to existing pages, nav, or workflows.

## Database

### New table: `brand_twin`
One row per client (client_id as primary key), with JSONB columns for each section:

| Column | Type | Default |
|--------|------|---------|
| `client_id` | uuid (PK, references clients) | — |
| `brand_basics_json` | jsonb | `{}` |
| `brand_voice_json` | jsonb | `{}` |
| `audience_json` | jsonb | `{}` |
| `offers_json` | jsonb | `{}` |
| `content_rules_json` | jsonb | `{}` |
| `source_material_json` | jsonb | `{}` |
| `updated_at` | timestamptz | `now()` |

RLS: SS roles only (read + write). Clients have no access.

## Routing

Add route in `App.tsx`:
```
/admin/client-brain/:clientId → <AdminRoute><ClientBrain /></AdminRoute>
```

## Navigation Entry Point

In `AdminClients.tsx`, add a "Brain" icon button on each client card (next to existing Strategy button). Links to `/admin/client-brain/{clientId}`. No sidebar changes — accessed from client workspace only.

## New Page: `src/pages/admin/ClientBrain.tsx`

### Layout
- Back button + client name header + "Stay Social Brain" title
- "Brand Twin" section label
- 6 collapsible card sections, each with editable fields
- Auto-save on blur or explicit Save button

### Section 1: Brand Basics
Fields: Business Name, Industry, Region/Market, Website, Primary Contact — rendered as labeled Input fields inside a Card.

### Section 2: Brand Voice
Fields: Tone/Personality, Writing Style, Messaging Style, Key Phrases to Use (tag list), Phrases to Avoid (tag list), CTA Style, Brand Positioning Summary (textarea).

### Section 3: Audience
Fields: Primary Audience, Secondary Audience, Pain Points (textarea), Objections (textarea), Desired Outcomes (textarea).

### Section 4: Offers
Fields: Main Services (tag list), Key Offers (tag list), Priority Services (tag list), Seasonal Focus (textarea).

### Section 5: Content Rules
Fields: Platforms Used (tag list), Preferred Content Types (tag list), Posting Goals, Compliance/Restrictions (textarea), Do/Don't Rules (textarea).

### Section 6: Source Material
- File upload (to `creative-assets` bucket under `brain/{clientId}/` path)
- Add links (stored as JSON array)
- Approved examples (stored as JSON array of URLs/descriptions)
- Internal notes (textarea)

### UX Details
- Card-based layout with section headers using existing `SectionHeader` component
- Collapsible sections via Accordion or Collapsible components
- Tag-list fields use inline chip input (type + Enter to add, X to remove)
- Clean, premium feel — generous spacing, muted labels, structured sections
- Mobile responsive with single-column stack

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: create `brand_twin` table + RLS |
| `src/pages/admin/ClientBrain.tsx` | New page component |
| `src/App.tsx` | Add route (1 line) |
| `src/pages/admin/AdminClients.tsx` | Add Brain icon button per client card |

## Security
- RLS restricted to `is_ss_role()` only — no client access
- File uploads use existing authenticated storage policies
- No new edge functions needed

