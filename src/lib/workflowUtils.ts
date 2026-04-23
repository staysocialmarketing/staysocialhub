import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

// ─── Single source of truth: status → display column ─────────────────────────
//
// One post record drives both views. viewType='admin' maps to the Workflow
// kanban; viewType='client' maps to the Content Pipeline kanban. Any status
// not explicitly listed falls back to null (hidden from that view).
//
// Revision routing: when a client requests changes, posts go back to
// 'corey_review' (content fix) or 'design' (design fix). Both appear in
// their normal admin columns and collapse to "In Progress" on the client side.

export type AdminColumnKey =
  | "new"
  | "ai_draft"
  | "design"
  | "corey_review"
  | "batch_pending"   // ready_for_client_batch — hidden from kanban, shown in Approval Batches
  | "client_approval" // client_approval — hidden from kanban, shown in Approval Batches
  | "ready_to_schedule"
  | "scheduled"
  | "posted";

export type ClientColumnKey =
  | "new"
  | "in_progress"
  | "for_approval"
  | "in_queue"
  | "posted";

export interface ColumnInfo {
  key: AdminColumnKey | ClientColumnKey;
  label: string;
  /** Hidden from the main kanban board (still returned for other UI sections) */
  hidden?: boolean;
}

const ADMIN_MAP: Partial<Record<PostStatus, ColumnInfo>> = {
  idea:                   { key: "new",              label: "New" },
  ai_draft:               { key: "ai_draft",         label: "AI Draft" },
  writing:                { key: "ai_draft",         label: "AI Draft" },
  design:                 { key: "design",           label: "Design" },
  internal_review:        { key: "corey_review",     label: "Corey Review" },
  corey_review:           { key: "corey_review",     label: "Corey Review" },
  ready_for_client_batch: { key: "batch_pending",    label: "Batch Pending", hidden: true },
  client_approval:        { key: "client_approval",  label: "Client Approval", hidden: true },
  request_changes:        { key: "corey_review",     label: "Corey Review" },
  approved:               { key: "ready_to_schedule", label: "Ready to Schedule" },
  ready_to_schedule:      { key: "ready_to_schedule", label: "Ready to Schedule" },
  ready_to_send:          { key: "ready_to_schedule", label: "Ready to Schedule" },
  scheduled:              { key: "scheduled",        label: "Scheduled" },
  published:              { key: "posted",           label: "Posted" },
  sent:                   { key: "posted",           label: "Posted" },
  complete:               { key: "posted",           label: "Posted" },
  // in_progress intentionally omitted — column is being removed (Phase 4)
};

const CLIENT_MAP: Partial<Record<PostStatus, ColumnInfo>> = {
  idea:                   { key: "new",         label: "New" },
  ai_draft:               { key: "in_progress", label: "In Progress" },
  writing:                { key: "in_progress", label: "In Progress" },
  design:                 { key: "in_progress", label: "In Progress" },
  in_progress:            { key: "in_progress", label: "In Progress" },
  internal_review:        { key: "in_progress", label: "In Progress" },
  corey_review:           { key: "in_progress", label: "In Progress" },
  ready_for_client_batch: { key: "in_progress", label: "In Progress" },
  request_changes:        { key: "in_progress", label: "In Progress" },
  client_approval:        { key: "for_approval", label: "For Approval" },
  approved:               { key: "in_queue",    label: "In Queue" },
  ready_to_schedule:      { key: "in_queue",    label: "In Queue" },
  ready_to_send:          { key: "in_queue",    label: "In Queue" },
  scheduled:              { key: "in_queue",    label: "In Queue" },
  published:              { key: "posted",      label: "Posted" },
  sent:                   { key: "posted",      label: "Posted" },
  complete:               { key: "posted",      label: "Posted" },
};

/**
 * Returns the display column for a post status in the given view.
 * Returns null for statuses that have no column in that view (e.g. in_progress
 * on the admin side after Phase 4 removes that column).
 */
export function getColumnForView(
  status: PostStatus,
  viewType: "admin" | "client",
): ColumnInfo | null {
  const map = viewType === "admin" ? ADMIN_MAP : CLIENT_MAP;
  return map[status] ?? null;
}

/** Ordered column definitions for the admin Workflow kanban (visible columns only). */
export const ADMIN_WORKFLOW_COLUMNS: { key: AdminColumnKey; label: string }[] = [
  { key: "new",               label: "New" },
  { key: "ai_draft",          label: "AI Draft" },
  { key: "design",            label: "Design" },
  { key: "corey_review",      label: "Corey Review" },
  { key: "ready_to_schedule", label: "Ready to Schedule" },
  { key: "scheduled",         label: "Scheduled" },
  { key: "posted",            label: "Posted" },
];

/** Ordered column definitions for the client Content Pipeline kanban. */
export const CLIENT_PIPELINE_COLUMNS: { key: ClientColumnKey; label: string }[] = [
  { key: "new",         label: "New" },
  { key: "in_progress", label: "In Progress" },
  { key: "for_approval", label: "For Approval" },
  { key: "in_queue",    label: "In Queue" },
  { key: "posted",      label: "Posted" },
];

/** All post_status values that belong to a given admin column key. */
export function getStatusesForAdminColumn(columnKey: AdminColumnKey): PostStatus[] {
  return (Object.entries(ADMIN_MAP) as [PostStatus, ColumnInfo][])
    .filter(([, col]) => col.key === columnKey)
    .map(([status]) => status);
}

/** All post_status values that belong to a given client column key. */
export function getStatusesForClientColumn(columnKey: ClientColumnKey): PostStatus[] {
  return (Object.entries(CLIENT_MAP) as [PostStatus, ColumnInfo][])
    .filter(([, col]) => col.key === columnKey)
    .map(([status]) => status);
}

const SOCIAL_TYPES = ["image", "video", "reel", "carousel", "social_post", "story", "google_post"];
const EMAIL_TYPES = ["email_campaign", "email"];

export function getContentCategory(contentType: string | null): "social" | "email" | "other" {
  if (!contentType) return "social";
  if (SOCIAL_TYPES.includes(contentType)) return "social";
  if (EMAIL_TYPES.includes(contentType)) return "email";
  return "other";
}

export function getApproveTarget(contentType: string | null, currentStatus: PostStatus): PostStatus {
  const category = getContentCategory(contentType);

  if (currentStatus === "ai_draft" as PostStatus) {
    return "design" as PostStatus;
  }

  if (currentStatus === "design" as PostStatus) {
    return "corey_review" as PostStatus;
  }

  if (currentStatus === "internal_review") {
    return "corey_review" as PostStatus;
  }

  if (currentStatus === "corey_review" as PostStatus) {
    return "ready_for_client_batch" as PostStatus;
  }

  if (currentStatus === "client_approval") {
    switch (category) {
      case "social": return "ready_to_schedule" as PostStatus;
      case "email": return "ready_to_send";
      case "other": return "complete";
    }
  }

  // Default fallback
  return "scheduled";
}

export const CONTENT_TYPE_OPTIONS = [
  { value: "social_post", label: "Social Post", category: "social" },
  { value: "image", label: "Image", category: "social" },
  { value: "video", label: "Video", category: "social" },
  { value: "reel", label: "Reel", category: "social" },
  { value: "story", label: "Story", category: "social" },
  { value: "carousel", label: "Carousel", category: "social" },
  { value: "google_post", label: "Google Post", category: "social" },
  { value: "email_campaign", label: "Email Campaign", category: "email" },
  { value: "email", label: "Email", category: "email" },
  { value: "ad_creative", label: "Ad Creative", category: "other" },
  { value: "landing_page", label: "Landing Page", category: "other" },
  { value: "graphic_design", label: "Graphic Design", category: "other" },
  { value: "website_update", label: "Website Update", category: "other" },
  { value: "general_task", label: "General Task", category: "other" },
];

export const REQUEST_TYPE_OPTIONS = [
  { value: "social_post", label: "Social Post" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "design", label: "Design" },
  { value: "video", label: "Video" },
  { value: "automation", label: "Automation" },
  { value: "strategy", label: "Strategy" },
  { value: "general", label: "General" },
];

export const AUDIENCE_OPTIONS = [
  "Client Database",
  "Realtor Partners",
  "Newsletter List",
  "Custom List",
];
