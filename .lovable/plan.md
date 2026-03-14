

# Fix Login Access and Add Domain-Level Approval

## Tristan's Issue

The "personal/business account" error is a Google Workspace restriction on mobile -- Google blocks OAuth when there's a conflict between personal and workspace accounts on the device. This is a Google-side limitation, not something we can fix in our app.

**Immediate fix**: Tristan can use the **Magic Link** option right now -- it bypasses Google OAuth entirely and works on any device. He just enters his email and clicks the link sent to his inbox.

## Domain-Level Approval for Future Signups

To prevent unauthorized access while keeping things open for legitimate users, we will add an `allowed_domains` table that acts as a whitelist. Only users with emails matching an approved domain can sign in.

### Database Changes

**New table: `allowed_domains`**
- `id` (uuid, PK)
- `domain` (text, unique) -- e.g. "staysocial.ca", "clientcompany.com"
- `created_at` (timestamptz)
- `added_by_user_id` (uuid)

RLS: SS roles can manage, all authenticated can read.

### Code Changes

**`src/pages/Auth.tsx`**
- After Google sign-in or magic link succeeds, check if the user's email domain is in `allowed_domains`
- If not found, sign them out immediately and show an error: "Your email domain is not authorized. Contact Stay Social to request access."
- This applies to both new and existing users whose domain isn't whitelisted

**`src/pages/admin/AdminUsers.tsx`** (or new section)
- Add a "Domains" management section where SS Admins can add/remove allowed domains
- Simple list with add/remove buttons
- Pre-populate with "staysocial.ca" and any existing client email domains

**`src/contexts/AuthContext.tsx`**
- Add domain validation check in the auth state change handler
- If a user signs in with an unauthorized domain, auto sign-out

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `allowed_domains` table with RLS |
| `src/pages/Auth.tsx` | Add domain check after successful auth |
| `src/contexts/AuthContext.tsx` | Add domain validation on auth state change |
| `src/pages/admin/AdminUsers.tsx` | Add domain management UI for SS Admins |

