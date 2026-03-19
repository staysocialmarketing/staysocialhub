

# Capture UI Redesign — Pressmaster-Inspired

## Overview
Redesign the Capture tab inside Stay Social Brain to feel more like Pressmaster's "Pin Your Thoughts" experience — clean, engaging, mobile-first, with category filtering and a more visual card layout. No database changes needed; this is purely a UI/UX overhaul of the existing `CaptureTab.tsx`.

## Design Inspiration (from Pressmaster)
- **Greeting header**: Personalized "Hi [Name], anything to capture?" instead of jumping straight to a textarea
- **Action grid**: 2x2 grid of large, visually distinct action cards (Pin Thought, Add Journal/Note, Record Voice, Add Link) with colored icons — replaces the current row of outline buttons
- **Category filter pills**: Horizontal scrollable filter row (All, Notes, Voice, Links, Files) above the feed
- **Cleaner card design**: Softer cards with colored type indicators (left border or dot), no expand/collapse chevrons — tap to open a detail sheet instead
- **Search**: Simple search input above the feed to filter captures
- **Mobile sticky bar**: Keep but refine — rounder, more prominent, with a large central record button

## Changes

### File: `src/components/brain/CaptureTab.tsx` (full rewrite of UI, same logic)

**1. Header Section**
- Show "Hi [user.name], anything to capture?" greeting
- Subtle, friendly tone — not a form

**2. Quick Action Grid (replaces button row)**
- 2x2 grid of tappable cards on mobile, horizontal row on desktop
- Each card: colored icon circle + label + subtle description
  - **Pin a Thought** (orange) — opens the text input area
  - **Record** (red) — starts voice recording
  - **Add Link** (blue) — toggles link input
  - **Upload File** (green) — triggers file picker
- Cards have soft background colors matching their icon, rounded-xl, generous padding

**3. Text Input**
- Slides open when "Pin a Thought" is tapped (or always visible on desktop)
- Single-line feel with auto-expand, send button appears on content
- Placeholder: "What's on your mind?"

**4. Filter Pills + Search**
- Horizontal pill row: All | Notes | Voice | Links | Files
- Active pill uses primary color fill
- Optional search input (magnifying glass icon, expands on tap)
- Filters the capture list by type

**5. Capture Feed Cards (redesigned)**
- Each card:
  - Left colored accent bar (2px) matching type color
  - Type icon (small, colored dot or icon)
  - Content preview (2 lines max, truncated)
  - Timestamp + creator name below
  - No chevrons — tap card to expand inline (same behavior, cleaner look)
- Expanded state:
  - Full content, transcript, attachments, notes — same data
  - Actions row: Notes, Delete (same functionality)
- Empty state: Illustration-style message "Your ideas live here. Capture your first thought."

**6. Mobile Sticky Bar (refined)**
- Rounded pill shape, slight shadow, offset from bottom
- Large central microphone button (48px, primary color)
- Left: "+" button for text capture
- Right: paperclip for file upload
- Feels more like a floating action group than a toolbar

### File: `src/pages/admin/ClientBrain.tsx`
- Minor: pass user name to CaptureTab if not already available via useAuth

## Visual Details
- Type color mapping: note=#fb5000, voice=#ef4444, link=#3b82f6, file=#22c55e
- Cards use `rounded-xl` with subtle shadow (`shadow-sm`)
- Action grid cards: `bg-orange-50 dark:bg-orange-950/20` pattern for each color
- Filter pills: `rounded-full px-4 py-1.5 text-sm font-medium`
- Generous spacing throughout — `space-y-6` between sections
- All existing functionality preserved — just restyled

## Files Changed

| File | Change |
|------|--------|
| `src/components/brain/CaptureTab.tsx` | Full UI rewrite — new layout, same data logic |

## What stays the same
- All database queries, mutations, voice recording logic
- Mobile sticky bar concept (just restyled)
- Expand/collapse card behavior
- Notes editing, delete, link input

## What does NOT change
- Brand Twin tab — untouched
- ClientBrain.tsx tabs structure — untouched
- No database migrations
- No new edge functions

