

# Architecture: Modular AI Interview System with Sub-Agents

## Concept

Restructure the interview system into a **main agent + sub-agent** model:

```text
┌─────────────────────────────────────┐
│         AI Interview System         │
├─────────────────────────────────────┤
│  Main Agent: Brand Onboarding       │
│  (voice, audience, offers, goals)   │
│  → Extracts to: brand_twin table    │
├─────────────────────────────────────┤
│  Sub-Agent: Website Discovery       │
│  (colors, fonts, layout, pages,     │
│   functionality, design preferences)│
│  → Extracts to: NEW website_brief   │
│     table (JSONB sections)          │
└─────────────────────────────────────┘
```

The existing templates (Full Onboarding, Brand Voice, Audience, Content Strategy) stay as they are under the main agent. The **Website Discovery** becomes a new template category with its own extraction schema and storage.

## Why One UI, Separate Templates

Both use the same `InterviewTab` component and `ai-interview` edge function — just with different templates, extraction prompts, and target tables. No need for a separate page or separate edge function. The key difference is:

- **Main agent templates** → extract to `brand_twin` table
- **Website sub-agent template** → extract to new `website_briefs` table with design-specific fields

## Database Changes

Create a new `website_briefs` table:

```sql
CREATE TABLE public.website_briefs (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  design_json jsonb NOT NULL DEFAULT '{}'::jsonb,    -- colors, fonts, style preferences
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb,    -- page structure, navigation, hero style
  functionality_json jsonb NOT NULL DEFAULT '{}'::jsonb, -- forms, booking, ecommerce, integrations
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,   -- page copy needs, tone for web vs social
  inspiration_json jsonb NOT NULL DEFAULT '{}'::jsonb, -- reference sites, likes/dislikes
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_briefs ENABLE ROW LEVEL SECURITY;

-- Same access pattern as brand_twin
CREATE POLICY "SS can manage website briefs" ON public.website_briefs
  FOR ALL TO authenticated USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Clients can view own website brief" ON public.website_briefs
  FOR SELECT TO authenticated USING (can_access_client(client_id));
```

## Edge Function Changes

### `supabase/functions/ai-interview/index.ts`
- Add a `website_discovery` template with a system prompt focused on design, colors, fonts, page structure, functionality needs, booking/forms, inspirational sites
- Add a `website_extract` extraction schema (maps to `website_briefs` JSONB columns)
- When `action === "extract"` and template is `website_discovery`, write to `website_briefs` instead of `brand_twin`

## Frontend Changes

### `src/components/brain/InterviewTab.tsx`
- Add `website_discovery` to the `TEMPLATES` array with its own color badge
- When extracting, check the template type to determine which extraction action to call
- No other UI changes needed — same chat interface, same voice toggle

### `src/pages/client/AIInterview.tsx`
- No changes — already renders `InterviewTab` which will show the new template option

### Navigation (sidebar + mobile)
- No changes needed — the Website Discovery interview is accessed from the same AI Interview page, just a different template selection

## Template Prompt (Website Discovery)

The system prompt will focus on:
1. Current website status (have one? what platform?)
2. Design preferences (modern/classic, colors, mood)
3. Must-have pages and their purpose
4. Functionality (booking, forms, ecommerce, galleries, blog)
5. Integrations (CRM, email, scheduling tools)
6. Inspiration sites they admire
7. Content needs (do they have copy? photos?)

## Summary

| Component | Change |
|---|---|
| Database | New `website_briefs` table |
| `ai-interview/index.ts` | Add `website_discovery` template + extraction schema |
| `InterviewTab.tsx` | Add template option to existing list |
| No new pages/routes | Everything lives in the existing interview UI |

This keeps things modular — each "sub-agent" is just a template with its own extraction target. Adding future sub-agents (e.g., "Ad Campaign Discovery", "Email Marketing Discovery") follows the same pattern: add template + extraction schema + target table.

