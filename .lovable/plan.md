

# Favicon & Sidebar Name Update

## Changes

### 1. Favicon (`index.html`)
- Reference the existing orange logo (`/src/assets/orange_with_black.png`) as the favicon
- Copy it to `public/favicon.png` and update `index.html` with `<link rel="icon" href="/favicon.png" type="image/png">`

### 2. Sidebar Name (`src/components/AppSidebar.tsx`)
- Update line 168-169 from:
  - "Stay Social" / "HUB"
- To:
  - "Stay Social" / "Client HUB"

### Files Changed

| File | Change |
|------|--------|
| `public/favicon.png` | Copy of orange logo |
| `index.html` | Add favicon link tag |
| `src/components/AppSidebar.tsx` | Update sidebar subtitle to "Client HUB" |

