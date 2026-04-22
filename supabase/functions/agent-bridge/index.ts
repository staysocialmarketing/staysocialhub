SHA: 94a8d7137c4660fae51c02e741124ef93d2ecff8
/**
 * agent-bridge — Supabase Edge Function
 *
 * Internal API for the NanoClaw AI agent (Lev) to interact with the HUB.
 * All requests must include:  x-api-key: <AGENT_BRIDGE_API_KEY>
 *
 * Routes (path suffix after /agent-bridge):
 *   POST /create-post          — create a new post for a client
 *   POST /update-post-status   — move a post to a new status
 *   POST /tag-user             — assign or set reviewer on a post
 *   POST /read-posts           — fetch posts for a client (with optional status filter)
 *   GET  /list-clients         — return all clients (id, name)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostStatus =
  | "idea" | "in_progress" | "writing" | "design"
  | "internal_review" | "corey_review" | "client_approval" | "request_changes"
  | "approved" | "scheduled" | "published" | "ready_to_schedule"
  | "ready_to_send" | "sent" | "complete" | "ready_for_client_batch"
  | "ai_draft";

const VALID_STATUSES = new Set<PostStatus>([
  "idea", "in_progress", "writing", "design",
  "internal_review", "corey_review", "client_approval", "request_changes",
  "approved", "scheduled", "published", "ready_to_schedule",
  "ready_to_send", "sent", "complete", "ready_for_client_batch", "ai_draft",
]);

const VALID_CONTENT_TYPES = new Set([
  "image", "video", "reel", "carousel",
  "email_campaign",
  "ad_creative", "landing_page", "graphic_design",
  "website_update", "general_task",
  "social_post", "email", "story", "google_post",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const err = (message: string, status = 400) => json({ success: false, error: message }, status);

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // OPTIONS pre-flight (Supabase Studio / curl testing)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-api-key",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const expectedKey = Deno.env.get("AGENT_BRIDGE_API_KEY");
  if (!expectedKey) {
    return err("Server misconfiguration: AGENT_BRIDGE_API_KEY not set", 500);
  }

  const providedKey = req.headers.get("x-api-key");
  if (!providedKey || providedKey !== expectedKey) {
    return err("Unauthorized", 401);
  }

  // ── Route ─────────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  // The path will be something like /agent-bridge/create-post
  const route = url.pathname.split("/").filter(Boolean).at(-1);

  // ── Supabase admin client (bypasses RLS — Lev is a trusted agent) ─────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return err("Server misconfiguration: Supabase environment not configured", 500);
  }
  const db = createClient(supabaseUrl, serviceKey);

  // ── GET routes ────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────────────────
  if (req.method === "GET" && route === "list-clients") {
    const { data, error } = await db
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) return err(error.message, 500);
    return json({ success: true, clients: data ?? [], count: (data ?? []).length });
  }

  // Block POST to a GET-only route
  if (req.method === "POST" && route === "list-clients") {
    return err("Method not allowed — use GET for /list-clients", 405);
  }

  // Reject unknown GET routes
  if (req.method === "GET") {
    return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /tag-user, POST /read-posts`, 404);
  }

  // ── POST routes ───────────────────────────────────────────────────────────

  if (req.method !== "POST") {
    return err("Method not allowed — use GET /list-clients or POST routes", 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  switch (route) {

    // ────────────────────────────────────────────────────────────────────────
    case "create-post": {
      const { client_id, title, platform, caption, hashtags, status, platform_content, content_type } = body as {
        client_id?: string;
        title?: string;
        platform?: string;
        caption?: string;
        hashtags?: string;
        status?: PostStatus;
        platform_content?: Record<string, Record<string, string>>;
        content_type?: string;
      };

      if (!client_id) return err("client_id is required");
      if (!title)     return err("title is required");
      if (content_type && !VALID_CONTENT_TYPES.has(content_type)) {
        return err(`Invalid content_type "${content_type}". Valid values: ${[...VALID_CONTENT_TYPES].join(", ")}`);
      }

      const postStatus: PostStatus = (status && VALID_STATUSES.has(status)) ? status : "ai_draft";

      // Derive platform text from platform_content keys if not explicitly provided
      const resolvedPlatform =
        platform ??
        (platform_content ? Object.keys(platform_content).join(",") : null);

      // Derive fallback caption from platform_content if not explicitly provided
      const resolvedCaption =
        caption ??
        (platform_content
          ? (platform_content.instagram?.caption ??
             platform_content.facebook?.caption ??
             null)
          : null);

      // Build platform_content from flat fields if not explicitly provided,
      // ensuring the NOT NULL constraint on the column is always satisfied.
      // platform may be a comma-separated string (e.g. "Instagram, Facebook"),
      // so split it into individual keys rather than using it as a single key.
      const normalizedPlatforms = (platform ?? "")
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);

      const resolvedPlatformContent =
        platform_content ??
        (normalizedPlatforms.length > 0
          ? Object.fromEntries(
              normalizedPlatforms.map((p) => [
                p,
                {
                  caption: caption ?? "",
                  ...(hashtags ? { hashtags } : {}),
                },
              ])
            )
          : { post: { caption: caption ?? "" } });

      const { data, error } = await db
        .from("posts")
        .insert({
          client_id,
          title,
          platform:         resolvedPlatform         ?? null,
          caption:          resolvedCaption           ?? null,
          hashtags:         hashtags                  ?? null,
          status_column:    postStatus,
          platform_content: resolvedPlatformContent,
          content_type:     content_type              ?? null,
        })
        .select("id, title, platform, platform_content, content_type, status_column, created_at")
        .single();

      if (error) return err(error.message, 500);
      return json({ success: true, post: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-post-status": {
      const { post_id, status } = body as { post_id?: string; status?: string };

      if (!post_id) return err("post_id is required");
      if (!status)  return err("status is required");
      if (!VALID_STATUSES.has(status as PostStatus)) {
        return err(`Invalid status "${status}". Valid values: ${[...VALID_STATUSES].join(", ")}`);
      }

      const { data, error } = await db
        .from("posts")
        .update({ status_column: status as PostStatus })
        .eq("id", post_id)
        .select("id, title, status_column")
        .single();

      if (error) return err(error.message, 500);
      if (!data)  return err("Post not found", 404);
      return json({ success: true, post: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "tag-user": {
      const { post_id, user_id, role } = body as {
        post_id?: string;
        user_id?: string;
        role?: "assignee" | "reviewer";
      };

      if (!post_id) return err("post_id is required");
      if (!user_id) return err("user_id is required");

      // role defaults to "assignee"; "reviewer" sets the reviewer_user_id column
      const column = role === "reviewer" ? "reviewer_user_id" : "assigned_to_user_id";

      const { data, error } = await db
        .from("posts")
        .update({ [column]: user_id })
        .eq("id", post_id)
        .select("id, title, assigned_to_user_id, reviewer_user_id")
        .single();

      if (error) return err(error.message, 500);
      if (!data)  return err("Post not found", 404);
      return json({ success: true, post: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-posts": {
      const { client_id, status, limit } = body as {
        client_id?: string;
        status?: string;
        limit?: number;
      };

      if (!client_id) return err("client_id is required");

      let query = db
        .from("posts")
        .select(`
          id, title, platform, caption, content_type, platform_content,
          status_column, assigned_to_user_id, reviewer_user_id, scheduled_at, created_at,
          post_images(id, url, storage_path, platform, position, alt_text)
        `)
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (status && VALID_STATUSES.has(status as PostStatus)) {
        query = query.eq("status_column", status);
      }

      if (typeof limit === "number" && limit > 0) {
        query = query.limit(Math.min(limit, 100));
      }

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      // Sort post_images by position ascending for each post
      const posts = (data ?? []).map((p: any) => ({
        ...p,
        post_images: Array.isArray(p.post_images)
          ? p.post_images.sort((a: any, b: any) => a.position - b.position)
          : [],
      }));

      return json({ success: true, posts, count: posts.length });
    }

    // ────────────────────────────────────────────────────────────────────────
    default:
      return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /tag-user, POST /read-posts`, 404);
  }
});

