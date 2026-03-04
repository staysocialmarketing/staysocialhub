

# Auth Page Fix

Comparing the current page to the reference site at staysocial.preview.staysocial.ca, the main issues are:

1. **Logo not rendering** — The `white_with_orange.png` image appears to not be displaying. Need to verify the asset path and ensure the image loads correctly. May need to use the orange logo variant instead or check the file was copied correctly.

2. **Visual polish to match reference** — The reference site uses:
   - A more subtle, darker background with a warm orange radial glow concentrated at the very top
   - Slightly more refined starfield with smaller, more numerous particles
   - Bolder, larger heading typography with gradient-like orange accent text

## Changes to `src/pages/Auth.tsx`

- Verify logo import path and swap to the correct asset if needed (the `white_with_orange.png` may have been copied with wrong naming)
- Increase logo size from `h-20` to `h-24` or larger
- Increase heading size from `text-3xl` to `text-4xl` for more impact
- Fine-tune the radial gradient to more closely match the reference's warm top glow
- Ensure the "or" divider background color matches the actual page background (currently hardcoded)

