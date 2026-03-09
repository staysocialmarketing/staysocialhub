

# Strategy Engine Preparation

## Summary
Upgrade the existing read-only `StrategyBriefPanel` into an editable Strategy section within request details. Add a "Generate Strategy" button that uses AI to auto-populate strategy fields from request + client context. Add a "Strategy Ready" badge on request cards. All visible only to SS roles.

## What Already Exists
- `strategy_brief` JSONB column on `requests` table — already stores strategy data
- `StrategyBriefPanel` — read-only collapsible display of brief fields
- `RunStrategyButton` — sends data to an external webhook (Zapier) for AI processing
- `client_profile`, `client_strategy` tables with brand voice, pillars, goals

## No Database Changes Needed
The `strategy_brief` JSONB column already exists and can hold the new field structure. No migration required.

## New Edge Function: `generate-strategy`
Create a new edge function that uses Lovable AI (e.g. `google/gemini-2.5-flash`) to generate a strategy draft:
- Fetches the request (title, notes, type)
- Fetches `client_strategy` (goals, pillars, campaigns, focus)
- Fetches `client_profile` (brand voice)
- Prompts the AI to produce structured JSON with fields: `objective`, `angle`, `primary_message`, `audience`, `campaign`, `cta`, `production_notes`
- Writes the result back to `requests.strategy_brief`
- Returns the generated brief

## Component Changes

### Replace `StrategyBriefPanel` usage in `RequestDetailDialog`
Create a new `StrategyEditPanel` component (SS roles only):
- Expandable collapsible section titled "Strategy"
- Displays 7 structured fields in a vertical layout
- Each field is an editable `Textarea` (for SS roles)
- "Generate Strategy" button calls the new edge function, populates fields as draft
- "Save" button writes edited fields back to `requests.strategy_brief`
- Uses the existing `strategy_brief` JSONB column with updated field keys

### Field mapping (old → new):
| New Field | JSONB Key |
|-----------|-----------|
| Strategic Objective | `objective` |
| Content Angle | `angle` |
| Primary Message | `primary_message` |
| Target Audience | `audience` |
| Campaign / Initiative | `campaign` |
| Call To Action | `cta` |
| Production Notes | `production_notes` |

### `src/pages/Requests.tsx`
- Add a "Strategy Ready" badge on request cards when `strategy_brief` is populated and has at least one non-empty field
- Only visible to SS roles

### `src/components/RequestDetailDialog.tsx`
- Replace the `StrategyBriefPanel` + `RunStrategyButton` block with the new `StrategyEditPanel`
- Still only shown when `isSSUser`

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `supabase/functions/generate-strategy/index.ts` | AI-powered strategy generation edge function |
| Create | `src/components/StrategyEditPanel.tsx` | Editable strategy panel with Generate + Save |
| Edit | `src/components/RequestDetailDialog.tsx` | Swap in StrategyEditPanel |
| Edit | `src/pages/Requests.tsx` | Add "Strategy Ready" badge on cards |

