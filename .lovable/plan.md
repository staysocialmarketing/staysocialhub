

# Sub-Phase B: Add-On Request System

## Database

### New table: `addon_requests`
- `id` (uuid, PK, default gen_random_uuid())
- `client_id` (uuid, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `addon_name` (text, NOT NULL)
- `status` (text, NOT NULL, default 'new')
- `created_at` (timestamptz, NOT NULL, default now())

### RLS policies
- **SELECT**: `can_access_client(client_id)` (clients see own, SS sees all)
- **INSERT**: `user_id = auth.uid() AND can_access_client(client_id)`
- **UPDATE/DELETE**: `is_ss_role()` (SS only)

## Frontend Changes

### 1. `src/pages/WhatsNew.tsx`
- Import `useAuth` to get `profile.client_id` and `user.id`
- Replace "Learn More" button with "Request Package"
- On click: insert into `addon_requests`, show success toast, disable button for already-requested add-ons
- Query existing requests on mount to show "Requested" state on cards already submitted

### 2. New admin page: `src/pages/admin/AdminAddonRequests.tsx`
- Table listing all `addon_requests` joined with `clients.name` and `users.name`
- Columns: Client, Add-On, Requested By, Date, Status
- SS can update status (new → contacted → closed)

### 3. `src/components/AppSidebar.tsx`
- Add `{ title: "Add-On Requests", url: "/admin/addon-requests", icon: ShoppingCart }` to `adminItems`

### 4. `src/App.tsx`
- Add route `/admin/addon-requests` inside AdminRoute

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `addon_requests` table + RLS |
| `src/pages/WhatsNew.tsx` | Request button + insert logic |
| `src/pages/admin/AdminAddonRequests.tsx` | New admin page |
| `src/components/AppSidebar.tsx` | Add admin nav item |
| `src/App.tsx` | Add route |

