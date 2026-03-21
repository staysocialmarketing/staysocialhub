

# Fix: Request Deletion on Mobile + View As on Mobile

## Two Issues

### 1. No delete button for requests
The `RequestDetailDialog` has no delete functionality at all — not just on mobile, but anywhere. Need to add a delete mutation and button (SS Admin only).

### 2. View As not available on mobile
The "View As" user picker only exists in `AppSidebar.tsx` (desktop sidebar). The `MobileMenu.tsx` component (shown in the bottom tab "More" sheet) doesn't include it.

## Plan

### Add Request Delete Button
**File:** `src/components/RequestDetailDialog.tsx`
- Add a delete mutation: `supabase.from("requests").delete().eq("id", request.id)`
- Add a `Trash2` delete button visible to SS Admin users, placed in the dialog header area
- Include confirmation dialog (AlertDialog) before deletion
- On success: invalidate queries, close dialog, show toast
- Note: RLS already allows SS roles to manage requests (though we should verify DELETE policy exists — if not, we'll need a migration)

### Add View As to Mobile Menu
**File:** `src/components/MobileMenu.tsx`
- Import `actualIsSSAdmin`, `isViewingAs`, `viewAsUserId`, `setViewAs` from `useAuth()`
- Add a "View As" section at the top of the menu (before navigation sections) when `actualIsSSAdmin` is true
- Use the same `Select` component pattern from `AppSidebar` — fetch all users with roles, group into Team/Clients
- Show "Active" badge when viewing as another user

### Verify RLS for Request Deletion
Check if requests table has a DELETE policy for SS roles. From the schema, I don't see an explicit DELETE policy — only SELECT, INSERT, UPDATE are listed. Will need a migration to add one.

## Files Summary

| File | Change |
|---|---|
| `src/components/RequestDetailDialog.tsx` | Add delete button with confirmation (SS Admin only) |
| `src/components/MobileMenu.tsx` | Add View As user picker for SS Admin |
| Migration | Add DELETE policy on `requests` table for SS roles (if missing) |

