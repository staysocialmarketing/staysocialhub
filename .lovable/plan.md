

# Stay Social HUB – V1 Final Updates

## Scope Summary

This covers 4 implementation areas. Items 3 (system review) and 6 (approval/workflow check) are validation tasks, not code changes — the existing workflow already matches the described flows based on code review.

---

## 1. Versioning System

### Database
New table: `platform_versions`
- `id` uuid PK
- `major_version` int NOT NULL DEFAULT 1
- `minor_version` int NOT NULL DEFAULT 0
- `title` text
- `notes` text
- `published_by_user_id` uuid
- `published_at` timestamptz DEFAULT now()
- `visible_to_clients` boolean DEFAULT false
- `created_at` timestamptz DEFAULT now()

RLS: SS roles can manage, all authenticated can SELECT.

### UI Changes

**`src/components/AppLayout.tsx`** — Fetch latest version, display `Stay Social HUB V{major}.{minor}` in the header next to the title.

**New page: `src/pages/admin/AdminVersions.tsx`**
- Admin-only page to manage versions
- Form: major version, minor version, title, release notes, visible to clients toggle
- List of past releases with version, date, title, notes
- Only ss_admin can change major version; minor version auto-increments on new entry

**`src/components/AppSidebar.tsx`** — Add "Versions" link under Admin section (ss_admin only).

**`src/pages/WhatsNew.tsx`** — Add a "Release Notes" section at the bottom showing client-visible version entries.

**`src/App.tsx`** — Add route `/admin/versions`.

---

## 2. Universal Inbox

### Database
New table: `universal_inbox`
- `id` uuid PK
- `source_type` text (email, screenshot, voice_note, quick_capture, automation)
- `title` text
- `raw_input_text` text
- `attachment_url` text
- `voice_transcript` text
- `suggested_client` text
- `suggested_item_type` text
- `suggested_content_type` text
- `suggested_priority` text
- `suggested_assignee` text
- `suggested_project` text
- `suggested_subproject` text
- `agent_confidence` numeric
- `status` text DEFAULT 'new' (new, ai_processed, needs_review, converted, archived)
- `converted_to_type` text (task, request, think_tank)
- `converted_to_id` uuid
- `created_by_user_id` uuid NOT NULL
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()

RLS: SS roles only (full CRUD).

### UI Changes

**New page: `src/pages/team/UniversalInbox.tsx`**
- Table/list view of inbox items with status badges, source type icons
- Filters by status and source type
- Detail view showing all fields
- Actions: Convert to Task / Request / Think Tank item, Archive
- Convert action creates the appropriate record and updates `converted_to_type`/`converted_to_id`, sets status to "converted"

**`src/components/AppSidebar.tsx`** — Add "Inbox" link in Team section.

**`src/App.tsx`** — Add route `/team/inbox`.

---

## 3. Capture Button Routing Update

**`src/components/GlobalCaptureButton.tsx`**
- For "Upload Screenshot/Image" and "Record Voice Note": add a destination selector at the bottom of the form — "Save to: Media Library | Universal Inbox"
- Default remains Media Library
- When Universal Inbox is selected, create a `universal_inbox` record instead of uploading directly to storage
- "Capture Idea" continues to Think Tank directly
- "Create Task" and "Create Request" continue directly

---

## 4. Version Display

**`src/components/AppLayout.tsx`**
- Query latest `platform_versions` row (order by published_at DESC, limit 1)
- Display version string in header: `Stay Social HUB V1.0`
- Subtle for all roles, same position

---

## Files Summary

| Action | File |
|--------|------|
| Migration | 1 SQL: `platform_versions` table + `universal_inbox` table |
| New | `src/pages/admin/AdminVersions.tsx` |
| New | `src/pages/team/UniversalInbox.tsx` |
| Edit | `src/components/AppLayout.tsx` (version display) |
| Edit | `src/components/AppSidebar.tsx` (nav links) |
| Edit | `src/components/GlobalCaptureButton.tsx` (inbox routing) |
| Edit | `src/pages/WhatsNew.tsx` (release notes section) |
| Edit | `src/App.tsx` (routes) |

## Notes
- Items 3 and 6 (system review, workflow check) describe existing behavior that is already implemented. No code changes needed — these are validation items to test manually after V1 publish.
- Item 7 (publish readiness) is an operational step, not a code change.

