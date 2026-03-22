

# Improved Interview Creation Flow + Onboarding Check

## Current Behavior
- Template is selected via a dropdown at the top, then "New Interview" or "Text Interview"/"Voice Call" is clicked
- No guidance on interview order or prerequisite checks

## Changes

### 1. "New Interview" → Template Picker Dialog
**File**: `src/components/brain/InterviewTab.tsx`

Replace the current flow where "New Interview" resets state and the template dropdown sits in the header. Instead:

- Click "New Interview" → opens a dialog/dropdown card showing all 5 template options as clickable cards (icon, title, description)
- Selecting a template sets it and enters the empty-state ready to start (Text Interview / Voice Call buttons)
- The top-bar template `<Select>` becomes read-only/display-only once an interview is active (already disabled, keep this)
- When no interview is active and no messages exist, show the template picker cards directly in the empty state area instead of the current generic "AI Brand Interview" message

### 2. Onboarding Pre-check for Non-Full Templates
**File**: `supabase/functions/ai-interview/index.ts`

For templates other than `full_onboarding`, inject a pre-check into the system prompt:

- Before starting, check if the client has a completed `full_onboarding` interview (status = "extracted") in `brain_interviews`
- If **no** completed onboarding exists, prepend to the system prompt an instruction: "Before starting, ask the client if they've completed the full onboarding interview. If not, ask if they'd like to do that first or continue with this focused session. If they want onboarding first, let them know they should start a Full Onboarding interview and come back. If they want to continue, proceed normally."
- If onboarding **exists**, proceed as usual with no extra prompt

This keeps it conversational — the AI asks, the user decides, no hard blocks.

### 3. Frontend Template Picker UI
**File**: `src/components/brain/InterviewTab.tsx`

When `!activeInterviewId && messages.length === 0`:
- Show a grid of template cards instead of the generic empty state
- Each card: colored icon/badge, template name, description
- Clicking a card sets the template and shows the "Text Interview" / "Voice Call" buttons
- Add a small "back" link to return to template selection if they haven't started yet

## Summary

| File | Change |
|---|---|
| `src/components/brain/InterviewTab.tsx` | Template picker cards in empty state, streamlined "New Interview" flow |
| `supabase/functions/ai-interview/index.ts` | Check for existing onboarding interview, inject pre-check prompt for non-full templates |

