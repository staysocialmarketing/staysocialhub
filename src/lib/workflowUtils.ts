import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

const SOCIAL_TYPES = ["image", "video", "reel", "carousel"];
const EMAIL_TYPES = ["email_campaign"];

export function getContentCategory(contentType: string | null): "social" | "email" | "other" {
  if (!contentType) return "social";
  if (SOCIAL_TYPES.includes(contentType)) return "social";
  if (EMAIL_TYPES.includes(contentType)) return "email";
  return "other";
}

export function getApproveTarget(contentType: string | null, currentStatus: PostStatus): PostStatus {
  const category = getContentCategory(contentType);

  if (currentStatus === "internal_review") {
    return "client_approval";
  }

  if (currentStatus === "client_approval") {
    switch (category) {
      case "social": return "scheduled";
      case "email": return "ready_to_send";
      case "other": return "complete";
    }
  }

  // Default fallback
  return "scheduled";
}

export const CONTENT_TYPE_OPTIONS = [
  { value: "image", label: "Image", category: "social" },
  { value: "video", label: "Video", category: "social" },
  { value: "reel", label: "Reel", category: "social" },
  { value: "carousel", label: "Carousel", category: "social" },
  { value: "email_campaign", label: "Email Campaign", category: "email" },
  { value: "ad_creative", label: "Ad Creative", category: "other" },
  { value: "landing_page", label: "Landing Page", category: "other" },
  { value: "graphic_design", label: "Graphic Design", category: "other" },
  { value: "website_update", label: "Website Update", category: "other" },
  { value: "general_task", label: "General Task", category: "other" },
];

export const AUDIENCE_OPTIONS = [
  "Client Database",
  "Realtor Partners",
  "Newsletter List",
  "Custom List",
];
