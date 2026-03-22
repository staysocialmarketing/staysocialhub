

# Fix: Content Generator Mobile Access + Client Dropdown

## Problem
1. The **client dropdown** on the Content Generator page may not be visible on mobile — need to verify rendering
2. The **mobile nav** (MobileMenu) does not include "Content Generator" for SS/admin users — it only appears in the client menu sections

## Changes

### 1. `src/components/MobileMenu.tsx`
Add "Content Generator" to the SS menu. Best fit: add an "AI Tools" or "Tools" section for SS users, or add it under the existing "Menu" section:
- Add `{ title: "Content Generator", url: "/client/generate", icon: Wand2 }` to the SS menu (likely under a new "Tools" section or appended to "Menu")

### 2. `src/pages/client/ContentGenerator.tsx`
Ensure the client dropdown renders properly on mobile:
- Verify `isSSRole` check works correctly (the dropdown is gated behind `isSSRole`)
- Make sure the Select component's `SelectContent` isn't clipped by parent overflow constraints

| File | Change |
|---|---|
| `src/components/MobileMenu.tsx` | Add Content Generator link for SS users |
| `src/pages/client/ContentGenerator.tsx` | Ensure client dropdown is visible on mobile viewport |

