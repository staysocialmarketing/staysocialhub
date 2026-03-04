

# Phase 2 Implementation Plan

This is a large set of features. I'll break it into logical implementation batches.

---

## Batch 1: Database Changes

Add an `internal_notes` column to the `posts` table for team-only notes. No other schema changes needed — all other tables (`post_versions`, `comments`, `approvals`, `requests`, `client_profile`) already exist with the right structure.

**Migration:**
```sql
ALTER TABLE public.posts ADD COLUMN internal_notes text;
```

---

## Batch 2: Create Post Card (Admin "New Post" button)

Add a **"+ New Post"** button on the Approvals board, visible only to SS roles. Opens a dialog with:
- Client selector (dropdown of all clients)
- Post Title
- Platform (multi-select: IG, FB, LinkedIn, TikTok)
- Caption
- Hashtags
- Upload Creative (file upload to `creative-assets` bucket)
- Schedule Date (optional date picker)
- Internal Notes (team-only, textarea)

Default status: `content_process`. Also creates a `post_versions` v1 record automatically.

**Files:** `src/pages/Approvals.tsx` (add create dialog)

---

## Batch 3: Card Layout Upgrade

Upgrade Kanban cards to show richer previews:
- Image/video thumbnail (already exists, keep)
- Platform icon badges (already exists, enhance with icons)
- Post title
- Scheduled date
- Status badge (colored by column)
- Comment count

**Hover tooltip** shows:
- Caption preview (first ~100 chars)
- Hashtag count

**Files:** `src/pages/Approvals.tsx` (upgrade card rendering, add Tooltip)

---

## Batch 4: Post Card Detail View

New page/modal at `/approvals/:postId` (or dialog). When clicking a card, open full detail view with:

### Sections:
1. **Creative** — Full image/video preview
2. **Caption** — Full text display
3. **Hashtags** — Full display
4. **Scheduled Date** — Read-only for clients
5. **Version History** — List of `post_versions` (v1, v2, v3…) with ability to view each version's creative/caption/hashtags
6. **Comments Thread** — All comments on this post with user names, timestamps. Input to add new comment.
7. **Internal Notes** — Only visible to SS roles. Editable textarea.
8. **Approval Panel** — For client_admin (and allowed assistants):
   - **Approve** button
   - **Approve with Notes** button (requires note input)
   - **Request Changes** button (requires note input)
   - Confirmation modal before action
   - Creates `approvals` record and moves card status

### Visual indicators:
- Badge showing latest approval status (Approved / Approved w/ Notes / Changes Requested)
- "Approved by [Name] on [Date]" text

**Files:** New `src/pages/PostDetail.tsx`, update `src/App.tsx` for route, update `src/pages/Approvals.tsx` to link cards to detail.

---

## Batch 5: Internal Notes (Team Only)

In the Post Detail view, add an "Internal Notes" section only visible when `isSSRole` is true. Reads/writes the `internal_notes` column on `posts`. Simple textarea with save button.

**Files:** Included in `src/pages/PostDetail.tsx`

---

## Batch 6: Request System Upgrade

Upgrade the request form to show different fields based on type:

**Social Post Request:**
- Topic / Key Message
- Link (optional URL)
- Attachment (file upload to `request-attachments` bucket)
- Preferred Publish Window
- Priority

**Email Campaign Request:**
- Campaign Type (dropdown: newsletter, promo, announcement, drip)
- Audience description
- Deadline (date picker)
- Notes
- Attachment

SS roles get a status management dropdown on each request card (open → in_progress → completed / cancelled).

**Files:** `src/pages/Requests.tsx` (upgrade form, add file upload, add type-specific fields, add SS status controls)

---

## Batch 7: Client Profile Buildout

Replace the current read-only display with an editable **Brand Voice Hub**. When client_admin clicks "Edit & Submit Changes," each tab becomes editable with proper form fields:

**A) Business Info:** Name, Location, Website, Booking Link (text inputs)
**B) Brand Voice:** Tone description, Topics to focus on, Topics to avoid (textareas)
**C) Content Preferences:** Platforms (multi-select), Posting frequency, Content mix (dropdowns/inputs)
**D) Offers & Services:** Services, Promos, Target audience, FAQs (textareas)
**E) Assets:** Logo, Headshots, Brand images (file uploads to `profile-assets` bucket with preview)

The draft editing flow already exists but currently has no form fields — this fills them in.

**Files:** `src/pages/Profile.tsx` (add editable form fields in draft mode, file uploads for assets tab)

---

## Batch 8: Admin Content Management Upgrade

Add the "New Post" creation flow to `AdminContent.tsx` as well, plus ability to edit posts, manage versions (upload new version), and view approval logs.

**Files:** `src/pages/admin/AdminContent.tsx`

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| Migration | Add `internal_notes` to posts |
| `src/pages/Approvals.tsx` | New Post dialog, card layout upgrade, click-to-detail |
| `src/pages/PostDetail.tsx` | **New file** — full detail view with comments, versions, approvals, internal notes |
| `src/App.tsx` | Add `/approvals/:postId` route |
| `src/pages/Requests.tsx` | Type-specific fields, file upload, SS status controls |
| `src/pages/Profile.tsx` | Editable form fields, file uploads for assets |
| `src/pages/admin/AdminContent.tsx` | New Post button, edit/version management |

