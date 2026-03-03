

# Stay Social Client Hub — Implementation Plan

## Overview
A client portal replacing Trello for social content approvals, centralizing requests and brand profiles. Hosted at portal.staysocial.ca, separate from GHL and the marketing site.

---

## Phase 1: Foundation & Auth

### Database Schema
Set up all tables via Lovable Cloud (Supabase): clients, plans, users, posts, post_versions, comments, approvals, requests, client_profile, profile_update_requests. Include RLS policies so client users only see their own client_id data, while Stay Social roles access everything. User roles stored in a separate roles-compatible structure.

### Authentication
- Google Sign-In + Magic Link email login
- Auth state management with protected routes
- Role-based access control (client_admin, client_assistant, ss_admin, ss_producer, ss_ops)
- Assistant invite flow: client_admin invites by email, creates user with parent_user_id linkage

### Storage Buckets
- `creative-assets` bucket for post images/videos
- `request-attachments` bucket for request file uploads
- `profile-assets` bucket for logos, headshots, brand photos

---

## Phase 2: App Shell & Navigation

### Sidebar Navigation
- Client roles see: Dashboard, Approvals, Requests, Profile, What's New
- Stay Social roles additionally see: Admin → Clients, Users, Profile Updates, Content
- Clean, modern dashboard aesthetic with Stay Social branding

---

## Phase 3: Client Dashboard

- Current plan name + inclusions display
- Count badges: items awaiting approval, open requests
- "What's New / Add-ons" static upsell tiles
- Quick action buttons: Request Social Post, Request Email Campaign, Review Content
- "Add an Assistant" button for client_admin role

---

## Phase 4: Social Approvals Kanban Board

### Kanban with 8 columns
NEW Requests HERE → Content Process → Design Process → Request Changes HERE → Content for Approval → Approved (by Client) → In The Queue → Published

### Card Previews
Creative thumbnail, title, platform tags, scheduled date, comment count, status

### Movement Permissions
- Stay Social roles: move anywhere
- Client Admin: only between "Content for Approval" ↔ "Approved" / "Request Changes"
- Client Assistant: same as admin if `assistants_can_approve` is ON, otherwise view-only

---

## Phase 5: Post Card Detail View

- Full creative preview (image/video)
- Caption, hashtags, platform, scheduled date (read-only for clients)
- Version history (v1, v2, etc.)
- Comment thread with real-time updates
- Approval flow: Approve / Approve with Notes / Request Changes confirmation modal
- Visual badges: Approved, Approved w/ Notes, Changes Requested
- Audit log: type, note, user, timestamp

---

## Phase 6: Requests Centre

- Two request types: Social Post Request, Email Campaign Request
- Form: topic/goal, notes, file attachments (real uploads), preferred publish window, priority
- Client users submit; Stay Social roles view and manage
- Status tracking on submitted requests

---

## Phase 7: Client Profile & Brand Voice

### 5 Tabs
A) Business Info  B) Brand Voice  C) Offers & Services  D) Content Preferences  E) Assets (file uploads)

### "Submit Changes for Review" Workflow
- Client admin edits draft → submits for review → creates profile_update_request
- Status badge shown to client (Pending Review)
- Stay Social admin can Approve (applies changes), Request Changes, or Reject
- Full audit trail: submitted_by, reviewed_by, timestamps, notes

---

## Phase 8: Admin Area (Stay Social Roles)

- **Clients**: Create/manage clients, assign plans, toggle `assistants_can_approve`
- **Users**: Create/manage users and assistants across clients
- **Content**: Create post cards, upload creative, edit details, move columns, manage versions
- **Profile Updates**: Review queue with approve/request changes/reject actions
- **Requests**: View and manage all client requests
- **Comments & Approvals**: View logs and comment threads

---

## Design Direction
- Modern, clean SaaS dashboard aesthetic
- Stay Social branded (colors, logo, fonts from your assets)
- Fast drag-and-drop Kanban interactions
- Responsive but desktop-first portal experience
- Professional card layouts with clear visual hierarchy

