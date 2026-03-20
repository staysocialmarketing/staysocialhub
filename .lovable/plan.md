

# Improve AI Interview: Resume, Mode Switching, Auto-Extract & Template Tracking

## What Changes

### 1. Resume Previous Interviews (text or voice)
Currently clicking a previous interview loads it read-only. After this change:
- Opening a previous interview loads its messages AND shows the input bar so you can continue typing
- A "Voice Call" button appears in the active interview header so you can switch to voice mid-conversation
- Voice transcripts append to the existing messages array (same interview record) rather than creating a new one

### 2. Switch Between Text ↔ Voice Within an Interview
- Add a `Phone` icon button next to the text input area — click it to switch to voice mode *within the same interview*
- When voice call ends, its transcript appends to the existing messages and you're back in text mode
- `VoiceCallPanel` receives existing messages so context carries over

### 3. Auto-Extract to Brand Twin After Each Session
- After a voice call ends or after 6+ messages in text chat, automatically trigger the extraction flow (the same `handleExtract` logic)
- Show a subtle toast: "Brand Twin auto-updated with new insights"
- No manual "Extract to Brain" click needed (button stays for manual re-extraction)

### 4. Track & Display Interview Template/Category
- Show the template badge on interview cards (already partially there)
- When resuming an interview, lock the template selector to the interview's saved template
- Show template category as a colored badge: Full Onboarding (purple), Brand Voice (blue), Audience (green), Content Strategy (orange)

### 5. Suggested Improvements (bonus)
- **Interview message count on cards** — already exists, but add a "last active" timestamp
- **"Continue" label** on interview cards instead of just clicking — clearer UX

---

## Technical Details

### File: `src/components/brain/InterviewTab.tsx`

**Resume interviews:**
- Remove the condition that hides input bar when viewing a previous interview (currently `messages.length > 0` gates the input, which works, but `startNew()` resets `activeInterviewId` — we need to keep it set when clicking a card)
- When clicking a card, set `activeInterviewId` and let existing `useEffect` load messages — input bar already shows since `messages.length > 0`

**Mode switching within interview:**
- Move the Voice Call button from empty-state-only to also appear in the input bar area (as an icon button)
- Update `startVoiceCall` to NOT reset `activeInterviewId` or messages
- Update `handleVoiceCallEnd` to append voice messages to existing `messages` state instead of replacing, then save

**Auto-extract:**
- After `saveMutation.mutate(finalMessages)` completes (in `onSuccess`), check if message count ≥ 6 and auto-call `handleExtract()`
- Same for `handleVoiceCallEnd` — after save, trigger extraction
- Add a flag to prevent double-extraction

**Template tracking:**
- Template selector already saves to `brain_interviews.template`
- Disable template selector when `activeInterviewId` is set (interview already has a template)
- Add color-coded badge mapping for the 4 templates on interview cards

### File: `src/components/brain/VoiceCallPanel.tsx`
- Accept optional `existingMessages` prop so voice context includes prior text conversation
- Append voice transcript to existing messages on call end

---

## Files Summary

| File | Change |
|---|---|
| `src/components/brain/InterviewTab.tsx` | Resume flow, mode switching, auto-extract, template badges |
| `src/components/brain/VoiceCallPanel.tsx` | Accept existing messages, append instead of replace |

No database changes needed — existing schema supports everything.

