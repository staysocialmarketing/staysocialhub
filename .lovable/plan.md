

# Merge Hub Assistant Into Global Capture Button

## What Changes

Remove the separate HubAssistant floating button. Instead, add "Hub Assistant" as an option in the existing capture button's action grid — same tile style as the other options. Below the grid, add a larger full-width "Voice Guidance" button that activates the assistant in a voice-first mode.

When the user taps "Hub Assistant," the capture drawer/dialog switches to the existing chat interface (text input + streaming AI responses). Same functionality, just accessed from within the capture menu instead of a separate button.

## Implementation

### 1. `src/components/GlobalCaptureButton.tsx`

- Add `"assistant"` to `CaptureMode` type
- Add assistant entry to `ACTION_CONFIG`: `{ label: "Hub Assistant", icon: Sparkles, bg: "bg-gradient-to-br from-primary/10 to-primary/5", text: "text-primary", desc: "Ask me anything" }`
- Add `"assistant"` to both `ssOptions` and `clientOptions` arrays
- Import and inline the chat UI from HubAssistant when `mode === "assistant"` (messages state, sendMessage logic, markdown rendering, SSE streaming)
- Add a full-width "Voice Guidance" button below the action grid (larger, gradient style, sparkles icon) — tapping it sets mode to `"assistant"` (text chat for now, voice can be Phase 2)
- Import `Sparkles`, `ReactMarkdown`, `ScrollArea`

### 2. `src/components/AppLayout.tsx`

- Remove `<HubAssistant />` import and render

### 3. `src/components/HubAssistant.tsx`

- Keep file (the chat logic will be reused/inlined into GlobalCaptureButton), but it will no longer render its own floating button

## Files Summary

| File | Change |
|---|---|
| `src/components/GlobalCaptureButton.tsx` | Add assistant mode with chat UI + voice guidance button |
| `src/components/AppLayout.tsx` | Remove HubAssistant |

