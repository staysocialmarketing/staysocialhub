/**
 * agent-bridge — Supabase Edge Function
 *
 * Internal API for the NanoClaw AI agent (Lev) to interact with the HUB.
 * All requests must include:  x-api-key: <AGENT_BRIDGE_API_KEY>
 *
 * Routes (path suffix after /agent-bridge):
 *   POST /create-post              — create a new post for a client
 *   POST /update-post-status       — move a post to a new status (also accepts notes/design_notes/design_prompts)
 *   POST /update-post              — update post fields (notes, design_notes, design_prompts, caption, etc.)
 *   POST /tag-user                 — assign or set reviewer on a post
 *   POST /read-posts               — fetch posts for a client (with optional status filter)
 *   GET  /list-clients             — return all clients (id, name)
 *   POST /update-doc               — upsert a doc row in agent_docs by key
 *   POST /create-task              — create a task
 *   POST /read-tasks               — fetch tasks with optional filters
 *   POST /create-project           — create a project
 *   POST /read-projects            — fetch projects with optional filters
 *   POST /create-think-tank-item   — create a think tank item
 *   POST /read-think-tank          — fetch think tank items with optional filters
 *   POST /update-think-tank-item   — update a think tank item by id
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

// Corey's user UUID — default created_by for Lev-generated records
const COREY_USER_ID = "6cd3d0da-0cbc-4bd5-b428-9f997218f5c2";

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
    return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /update-post, POST /tag-user, POST /read-posts, POST /update-doc, POST /create-task, POST /read-tasks, POST /create-project, POST /read-projects, POST /create-think-tank-item, POST /read-think-tank, POST /update-think-tank-item`, 404);
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
      const { client_id, title, platform, caption, hashtags, status, platform_content, content_type, notes, design_notes, design_prompts } = body as {
        client_id?: string;
        title?: string;
        platform?: string;
        caption?: string;
        hashtags?: string;
        status?: PostStatus;
        platform_content?: Record<string, Record<string, string>>;
        content_type?: string;
        notes?: string;
        design_notes?: string;
        design_prompts?: Record<string, unknown>;
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
          notes:            notes                     ?? null,
          design_notes:     design_notes              ?? null,
          design_prompts:   design_prompts            ?? null,
        })
        .select("id, title, platform, platform_content, content_type, status_column, notes, design_notes, design_prompts, created_at")
        .single();

      if (error) return err(error.message, 500);
      return json({ success: true, post: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-post-status": {
      const { post_id, status, notes, design_notes, design_prompts } = body as {
        post_id?: string;
        status?: string;
        notes?: string;
        design_notes?: string;
        design_prompts?: Record<string, unknown>;
      };

      if (!post_id) return err("post_id is required");
      if (!status)  return err("status is required");
      if (!VALID_STATUSES.has(status as PostStatus)) {
        return err(`Invalid status "${status}". Valid values: ${[...VALID_STATUSES].join(", ")}`);
      }

      const updates: Record<string, unknown> = { status_column: status as PostStatus };
      if (notes          !== undefined) updates.notes          = notes;
      if (design_notes   !== undefined) updates.design_notes   = design_notes;
      if (design_prompts !== undefined) updates.design_prompts = design_prompts;

      const { data, error } = await db
        .from("posts")
        .update(updates)
        .eq("id", post_id)
        .select("id, title, status_column, notes, design_notes, design_prompts")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data)  return err("Post not found", 404);
      return json({ success: true, post: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-post": {
      // Note: caption and hashtags are intentionally not accepted here.
      // The UI renders from platform_content; updating bare caption/hashtags
      // creates invisible updates for posts that have platform_content.
      // To update copy, pass platform_content with the full per-platform object.
      const { post_id, notes, design_notes, design_prompts, title, platform_content, status } = body as {
        post_id?: string;
        notes?: string;
        design_notes?: string;
        design_prompts?: Record<string, unknown>;
        title?: string;
        platform_content?: Record<string, Record<string, string>>;
        status?: PostStatus;
      };

      if (!post_id) return err("post_id is required");

      const updates: Record<string, unknown> = {};
      if (notes            !== undefined) updates.notes            = notes;
      if (design_notes     !== undefined) updates.design_notes     = design_notes;
      if (design_prompts   !== undefined) updates.design_prompts   = design_prompts;
      if (title            !== undefined) updates.title            = title;
      if (platform_content !== undefined) updates.platform_content = platform_content;
      if (status           !== undefined) {
        if (!VALID_STATUSES.has(status)) {
          return err(`Invalid status "${status}". Valid values: ${[...VALID_STATUSES].join(", ")}`);
        }
        updates.status_column = status;
      }

      if (Object.keys(updates).length === 0) {
        return err("No fields provided to update");
      }

      const { data, error } = await db
        .from("posts")
        .update(updates)
        .eq("id", post_id)
        .select("id, title, status_column, notes, design_notes, design_prompts")
        .maybeSingle();

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
        .maybeSingle();

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
          notes, design_notes, design_prompts,
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
    case "update-doc": {
      const { key, title, content, updated_by } = body as {
        key?: string;
        title?: string;
        content?: string;
        updated_by?: string;
      };

      if (!key)     return err("key is required");
      if (content === undefined || content === null) return err("content is required");

      const upsertPayload: Record<string, unknown> = {
        key,
        content,
        updated_by: updated_by ?? "lev",
        updated_at: new Date().toISOString(),
      };
      if (title !== undefined) upsertPayload.title = title;

      const { error } = await db
        .from("agent_docs")
        .upsert(upsertPayload, { onConflict: "key" });

      if (error) return err(error.message, 500);
      return json({ success: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "create-task": {
      const {
        title,
        description,
        project_id,
        client_id,
        priority,
        due_at,
        assigned_to_team,
        created_by_user_id,
      } = body as {
        title?: string;
        description?: string;
        project_id?: string;
        client_id?: string;
        priority?: string;
        due_at?: string;
        assigned_to_team?: string;
        created_by_user_id?: string;
      };

      if (!title) return err("title is required");
      if (!created_by_user_id) return err("created_by_user_id is required");

      const { data, error } = await db
        .from("tasks")
        .insert({
          title,
          description:         description         ?? null,
          project_id:          project_id          ?? null,
          client_id:           client_id           ?? null,
          priority:            priority            ?? "normal",
          due_at:              due_at              ?? null,
          assigned_to_team:    assigned_to_team    ?? false,
          status:              "todo",
          created_by_user_id,
        })
        .select("id")
        .single();

      if (error) return err(error.message, 500);
      return json({ success: true, task_id: data.id });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-tasks": {
      const { client_id, project_id, status, limit } = body as {
        client_id?: string;
        project_id?: string;
        status?: string;
        limit?: number;
      };

      let query = db
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50);

      if (client_id)  query = query.eq("client_id", client_id);
      if (project_id) query = query.eq("project_id", project_id);
      if (status)     query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return err(error.message, 500);
      return json({ success: true, tasks: data ?? [], count: (data ?? []).length });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "create-project": {
      const {
        name,
        description,
        client_id,
        parent_project_id,
        status,
        created_by_user_id,
      } = body as {
        name?: string;
        description?: string;
        client_id?: string;
        parent_project_id?: string;
        status?: string;
        created_by_user_id?: string;
      };

      if (!name) return err("name is required");
      if (!created_by_user_id) return err("created_by_user_id is required");

      const { data, error } = await db
        .from("projects")
        .insert({
          name,
          description:        description        ?? null,
          client_id:          client_id          ?? null,
          parent_project_id:  parent_project_id  ?? null,
          status:             status             ?? "active",
          created_by_user_id,
        })
        .select("id")
        .single();

      if (error) return err(error.message, 500);
      return json({ success: true, project_id: data.id });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-projects": {
      const { client_id, status, limit } = body as {
        client_id?: string;
        status?: string;
        limit?: number;
      };

      let query = db
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50);

      if (client_id) query = query.eq("client_id", client_id);
      if (status)    query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return err(error.message, 500);
      return json({ success: true, projects: data ?? [], count: (data ?? []).length });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "create-think-tank-item": {
      const {
        title,
        body: itemBody,
        type,
        client_id,
        project_id,
        ai_summary,
        strategy_brief,
        created_by_user_id,
      } = body as {
        title?: string;
        body?: string;
        type?: string;
        client_id?: string;
        project_id?: string;
        ai_summary?: string;
        strategy_brief?: Record<string, unknown>;
        created_by_user_id?: string;
      };

      if (!title) return err("title is required");
      if (!created_by_user_id) return err("created_by_user_id is required");

      const { data, error } = await db
        .from("think_tank_items")
        .insert({
          title,
          body:               itemBody            ?? null,
          type:               type                ?? "idea",
          client_id:          client_id           ?? null,
          project_id:         project_id          ?? null,
          ai_summary:         ai_summary          ?? null,
          strategy_brief:     strategy_brief      ?? null,
          status:             "open",
          created_by_user_id,
        })
        .select("id")
        .single();

      if (error) return err(error.message, 500);
      return json({ success: true, item_id: data.id });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-think-tank": {
      const { type, status, client_id, limit } = body as {
        type?: string;
        status?: string;
        client_id?: string;
        limit?: number;
      };

      let query = db
        .from("think_tank_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50);

      if (type)      query = query.eq("type", type);
      if (status)    query = query.eq("status", status);
      if (client_id) query = query.eq("client_id", client_id);

      const { data, error } = await query;
      if (error) return err(error.message, 500);
      return json({ success: true, items: data ?? [], count: (data ?? []).length });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-think-tank-item": {
      const {
        item_id,
        status,
        title,
        body: itemBody,
        ai_summary,
        strategy_brief,
      } = body as {
        item_id?: string;
        status?: string;
        title?: string;
        body?: string;
        ai_summary?: string;
        strategy_brief?: Record<string, unknown>;
      };

      if (!item_id) return err("item_id is required");

      const updates: Record<string, unknown> = {};
      if (status         !== undefined) updates.status         = status;
      if (title          !== undefined) updates.title          = title;
      if (itemBody       !== undefined) updates.body           = itemBody;
      if (ai_summary     !== undefined) updates.ai_summary     = ai_summary;
      if (strategy_brief !== undefined) updates.strategy_brief = strategy_brief;

      if (Object.keys(updates).length === 0) {
        return err("No fields provided to update");
      }

      const { data, error } = await db
        .from("think_tank_items")
        .update(updates)
        .eq("id", item_id)
        .select("id")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err("Think tank item not found", 404);
      return json({ success: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    default:
      return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /update-post, POST /tag-user, POST /read-posts, POST /update-doc, POST /create-task, POST /read-tasks, POST /create-project, POST /read-projects, POST /create-think-tank-item, POST /read-think-tank, POST /update-think-tank-item`, 404);
  }
});
