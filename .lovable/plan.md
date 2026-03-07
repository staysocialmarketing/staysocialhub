

# Global Capture Button — Client View Support

## Changes to `src/components/GlobalCaptureButton.tsx`

### 1. Remove the `isSSRole`-only guard
Currently line 188 returns `null` if not SS role. Change to also render for `isClientAdmin` and `isClientAssistant`.

### 2. Filter options by role
- **SS roles**: All 5 options (Task, Request, Idea, Image, Voice)
- **Client roles**: Only 3 options (Request, Image, Voice) — no Task or Idea

### 3. Auto-set client for client uploads
For client users, skip the client selector entirely. Use `profile.client_id` as the upload folder so their media is automatically tied to their account. The `creative-assets` bucket is shared and public, so Admin/Team already see all files in it (the Media Library reads from the same bucket).

### 4. Hide client selector for client roles
In the Image and Voice forms, hide the `<ClientSelectWithCreate>` component when the user is a client role — their `client_id` is used automatically.

### 5. Skip loading SS users/projects for client roles
In `handleOpen`, only fetch SS users and projects when `isSSRole` is true (clients don't need those selectors).

## Files Changed

| File | Change |
|------|--------|
| `src/components/GlobalCaptureButton.tsx` | Add client role support, filter options, auto-set client_id for uploads |

No database or storage changes needed — client uploads go to the same `creative-assets` bucket that Admin/Team already browse.

