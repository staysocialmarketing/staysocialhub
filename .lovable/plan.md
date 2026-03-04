

# Branding Update Plan

## Brand Assets
- Copy `orange_with_black.png` to `src/assets/` for use in the sidebar (dark background → orange+black logo variant)
- Copy `white_with_orange.png` to `src/assets/` for use on the auth page (light background → white+orange variant)

## Color Changes
Update CSS variables in `src/index.css` to use **#fb5000** as the primary accent instead of the current coral (`4 78% 63%`).

`#fb5000` in HSL is approximately `19 100% 49%`. This replaces `--primary`, `--ring`, `--sidebar-primary`, and `--sidebar-ring` in both light and dark themes.

The sidebar background stays dark navy (no change to `--sidebar-background`).

## Files to Edit

1. **Copy logo files** into `src/assets/`
2. **`src/index.css`** — Update `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` to `19 100% 49%`
3. **`src/components/AppSidebar.tsx`** — Replace the "SS" box with an `<img>` using the orange+black logo
4. **`src/pages/Auth.tsx`** — Replace the "SS" box with the orange+black logo on the login page

