

# Content Library Page

## What
Add a "Content Library" nav item and page where clients can browse all their past published posts — images, videos, and reels — organized in a visual grid. This is a read-only archive that pulls from the existing `posts` table (filtering by `status_column = 'published'`).

## Changes

### 1. Sidebar (`src/components/AppSidebar.tsx`)
- Add `{ title: "Content Library", url: "/content-library", icon: FolderOpen }` to `clientItems` array (between "Requests" and "Profile")

### 2. New page (`src/pages/ContentLibrary.tsx`)
- Query `posts` where `status_column = 'published'` and `can_access_client` (RLS handles scoping)
- Display a filterable grid of post cards showing:
  - Creative thumbnail (image/video poster)
  - Post title, platform badge, published date
- Filter tabs: All | Images | Videos | Reels (filter by `platform` field containing "Instagram Reel" / "TikTok" for reels, or by file extension on `creative_url`)
- Click a card to navigate to `/approvals/:postId` (existing PostDetail page) for full details

### 3. Route (`src/App.tsx`)
- Add `<Route path="/content-library" element={<ContentLibrary />} />` inside the protected layout

### No database changes needed
The existing `posts` table and RLS policies already support this — clients can only see their own client's posts, and SS roles see all.

