

# Delete Interviews + Fix Auto-Start

## Changes

### 1. Fix auto-start in `startNew()`

**File:** `src/components/brain/InterviewTab.tsx` (line 248-255)

Remove `streamChat([])` from `startNew()`. This stops it from immediately creating a new AI conversation thread. Instead, the user returns to the empty state and explicitly clicks "Text Interview" or "Voice Call."

### 2. Add delete button to interview cards

**File:** `src/components/brain/InterviewTab.tsx`

- Import `Trash2` from lucide-react
- Add a delete mutation: `supabase.from("brain_interviews").delete().eq("id", id)`
- Render a `Trash2` icon button on each interview card in the "Previous Interviews" list
- Use `e.stopPropagation()` so clicking delete doesn't open the interview
- Show a toast on success and invalidate the query cache
- RLS already allows SS roles to delete (`SS can manage brain interviews` ALL policy)

### 3. Add a dedicated "Start Text Interview" action

Update the empty-state "Text Interview" button's `onClick` to call `streamChat([])` directly (moving the auto-start logic to the explicit button click instead of `startNew`).

---

## Files Summary

| File | Change |
|---|---|
| `src/components/brain/InterviewTab.tsx` | Remove auto-start from `startNew`, add delete mutation + trash button on cards |

---

## Suggested Next Update

After this, the highest-impact next step would be **adding the 3 new client pages (AI Interview, Brand Twin, Content Generator) to the client sidebar navigation** so client users can actually access them. Currently the routes exist but there are no nav links.

