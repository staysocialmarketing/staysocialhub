

# Fix AI Interview + Restructure Client Navigation

## Issue 1: AI Interview Not Working

**Root cause**: The `ai-interview` edge function is missing from `supabase/config.toml`. Without `verify_jwt = false`, the function either isn't deployed or rejects requests at the infrastructure level (no logs at all confirms this).

**Fix**: Add the function config entry:
```toml
[functions.ai-interview]
verify_jwt = false
```

That single change should make the AI Interview functional.

---

## Issue 2: Client Menu Architecture for 3 Layers

The client menu currently has 9 items and will grow as we add AI features (Content Generator, AI Interview for DIY users, etc.). The best pattern for your 3-layer model is a **tabbed hub** approach — keep the bottom tab bar lean (4 tabs + More), but reorganize what's inside.

### Proposed Structure

```text
Bottom Tab Bar (all layers):
  Home | Approvals | Requests | Calendar | More

"More" Sheet — reorganized by section:
  ┌─────────────────────────────┐
  │  My Content                 │
  │    Success Center           │
  │    My Media                 │
  │    My Plan                  │
  │                             │
  │  AI Tools (Layer 3 / DIY)   │
  │    AI Interview             │
  │    Content Generator        │
  │    Brand Twin               │
  │                             │
  │  Account                    │
  │    My Profile               │
  │    What's New               │
  │    Sign Out                 │
  └─────────────────────────────┘
```

For **Layer 2 (managed clients)**, the AI Tools section is hidden — they don't need self-serve AI. For **Layer 3 (DIY)**, it's fully visible. This is controlled by the existing role system (`client_admin` vs a future `diy` role or a flag on the client record).

### Desktop Sidebar

Same grouping applies — add section headers to `clientItems` in `AppSidebar.tsx` matching the mobile menu structure.

### Changes

**Files to modify:**
- `supabase/config.toml` — add `ai-interview` function config
- `src/components/MobileMenu.tsx` — group client items into labeled sections
- `src/components/AppSidebar.tsx` — mirror the grouped structure for desktop

This keeps the navigation clean now and scalable as we add Batch B (Content Generator) and Batch C (AI Pipeline) features.

---

## Summary

| Change | Impact |
|---|---|
| Add `ai-interview` to config.toml | Fixes the AI interview function |
| Restructure client menu into sections | Cleaner nav, ready for AI tools |
| Mirror sections in desktop sidebar | Consistent experience across devices |

