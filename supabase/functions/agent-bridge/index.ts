/**
 * agent-bridge — Supabase Edge Function
 *
 * Internal API for the NanoClaw AI agent (Lev) to interact with the HUB.
 * All requests must include:  x-api-key: <AGENT_BRIDGE_API_KEY>
 *
 * Routes (path suffix after /agent-bridge):
 *   POST /create-post              — create a new post for a client
 *   POST /update-post-status       — move a post to a new status (also accepts notes/design_notes/design_prompts)
 *   POST /update-post              — update post fields (title, caption, platform, content_type, scheduled_at, hashtags, notes, design_notes, design_prompts, platform_content)
 *   POST /tag-user                 — assign or set reviewer on a post
 *   POST /read-posts               — fetch posts for a client (with optional status filter)
 *   GET  /list-clients             — return all clients (id, name)
 *   POST /update-doc               — upsert a doc row in agent_docs by key
 *   POST /create-task              — create a task
 *   POST /read-tasks               — fetch tasks with optional filters
 *   POST /create-project           — create a project (accepts due_at)
 *   POST /read-projects            — fetch projects with optional filters
 *   POST /update-project           — update project fields (name, description, status, due_at)
 *   POST /create-think-tank-item   — create a think tank item
 *   POST /read-think-tank          — fetch think tank items with optional filters
 *   POST /update-think-tank-item   — update a think tank item by id
 *   POST /read-queue               — atomically claim oldest pending nanoclaw_queue item (sets status → processing)
 *   POST /update-queue-item        — mark a queue item processed or failed (must be in processing state)
 *   POST /requeue-item             — reset a stuck processing item back to pending
 *   POST /read-playbook            — fetch all brand_twin data for a client
 *   POST /update-playbook          — upsert brand_twin JSON fields for a client (partial update)
 *   POST /upload-image             — upload a base64-encoded image to a post (stores in creative-assets, creates post_images record)
 *   POST /delete-post              — delete a post (with optional status guard)
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
    return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /update-post, POST /tag-user, POST /read-posts, POST /update-doc, POST /create-task, POST /read-tasks, POST /update-task-status, POST /create-project, POST /read-projects, POST /update-project, POST /create-think-tank-item, POST /read-think-tank, POST /update-think-tank-item, POST /read-queue, POST /update-queue-item, POST /requeue-item, POST /read-playbook, POST /update-playbook, POST /upload-image, POST /delete-image, POST /delete-post`, 404);
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
      const { post_id, notes, design_notes, design_prompts, title, platform_content, status, caption, platform, content_type, scheduled_at, hashtags } = body as {
        post_id?: string;
        notes?: string;
        design_notes?: string;
        design_prompts?: Record<string, unknown>;
        title?: string;
        platform_content?: Record<string, Record<string, string>>;
        status?: PostStatus;
        caption?: string;
        platform?: string;
        content_type?: string;
        scheduled_at?: string;
        hashtags?: string[];
      };

      if (!post_id) return err("post_id is required");

      const updates: Record<string, unknown> = {};
      if (notes            !== undefined) updates.notes            = notes;
      if (design_notes     !== undefined) updates.design_notes     = design_notes;
      if (design_prompts   !== undefined) updates.design_prompts   = design_prompts;
      if (title            !== undefined) updates.title            = title;
      if (platform_content !== undefined) updates.platform_content = platform_content;
      if (caption          !== undefined) updates.caption          = caption;
      if (platform         !== undefined) updates.platform         = platform;
      if (content_type     !== undefined) updates.content_type     = content_type;
      if (scheduled_at     !== undefined) updates.scheduled_at     = scheduled_at;
      if (hashtags         !== undefined) updates.hashtags         = hashtags;
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
        .select("id, title, platform, caption, hashtags, content_type, scheduled_at, status_column, notes, design_notes, design_prompts")
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
        assigned_to_user_id,
        blocked_by,
        created_by_user_id,
      } = body as {
        title?: string;
        description?: string;
        project_id?: string;
        client_id?: string;
        priority?: string;
        due_at?: string;
        assigned_to_team?: string;
        assigned_to_user_id?: string;
        blocked_by?: string;
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
          assigned_to_user_id: assigned_to_user_id ?? null,
          blocked_by:          blocked_by          ?? null,
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
      const { client_id, project_id, status, assigned_to_user_id, limit } = body as {
        client_id?: string;
        project_id?: string;
        status?: string;
        assigned_to_user_id?: string;
        limit?: number;
      };

      let query = db
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50);

      if (client_id)            query = query.eq("client_id", client_id);
      if (project_id)           query = query.eq("project_id", project_id);
      if (status)               query = query.eq("status", status);
      if (assigned_to_user_id)  query = query.eq("assigned_to_user_id", assigned_to_user_id);

      const { data, error } = await query;
      if (error) return err(error.message, 500);
      return json({ success: true, tasks: data ?? [], count: (data ?? []).length });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-task-status": {
      const { task_id, status } = body as { task_id?: string; status?: string };
      if (!task_id) return err("task_id is required");
      if (!status)  return err("status is required");

      const VALID = ["backlog", "todo", "in_progress", "waiting", "review", "complete"];
      if (!VALID.includes(status)) return err(`status must be one of: ${VALID.join(", ")}`);

      const { data, error } = await db
        .from("tasks")
        .update({ status })
        .eq("id", task_id)
        .select("id, status")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err(`Task not found: ${task_id}`, 404);
      return json({ success: true, task: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "create-project": {
      const {
        name,
        description,
        client_id,
        parent_project_id,
        status,
        due_at,
        created_by_user_id,
      } = body as {
        name?: string;
        description?: string;
        client_id?: string;
        parent_project_id?: string;
        status?: string;
        due_at?: string;
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
          due_at:             due_at             ?? null,
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
    case "update-project": {
      const {
        project_id,
        name,
        description,
        status,
        due_at,
      } = body as {
        project_id?: string;
        name?: string;
        description?: string;
        status?: string;
        due_at?: string;
      };

      if (!project_id) return err("project_id is required");

      const updates: Record<string, unknown> = {};
      if (name        !== undefined) updates.name        = name;
      if (description !== undefined) updates.description = description;
      if (status      !== undefined) updates.status      = status;
      if (due_at      !== undefined) updates.due_at      = due_at;

      if (Object.keys(updates).length === 0) {
        return err("No fields provided to update");
      }

      const { data, error } = await db
        .from("projects")
        .update(updates)
        .eq("id", project_id)
        .select("id, name, description, status, due_at")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err("Project not found", 404);
      return json({ success: true, project: data });
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
    case "read-queue": {
      // Atomically claim the oldest pending item: UPDATE ... RETURNING avoids race conditions.
      const { data, error } = await db
        .from("nanoclaw_queue")
        .update({ status: "processing" })
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .select("id, event_type, post_id, client_id, title, content_type, priority, created_at")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data)  return json({ success: true, item: null });
      return json({ success: true, item: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-queue-item": {
      const { id, status, error_message } = body as {
        id?: string;
        status?: string;
        error_message?: string;
      };

      if (!id)     return err("id is required");
      if (!status) return err("status is required");
      if (status !== "processed" && status !== "failed") {
        return err(`Invalid status "${status}". Valid values: processed, failed`);
      }

      const updates: Record<string, unknown> = {
        status,
        processed_at: new Date().toISOString(),
      };
      if (error_message !== undefined) updates.error_message = error_message;

      const { data, error: updateError } = await db
        .from("nanoclaw_queue")
        .update(updates)
        .eq("id", id)
        .eq("status", "processing")
        .select("id, status, processed_at")
        .maybeSingle();

      if (updateError) return err(updateError.message, 500);
      if (!data)       return err("Queue item not found or not in processing state", 404);
      return json({ success: true, item: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "requeue-item": {
      const { id } = body as { id?: string };

      if (!id) return err("id is required");

      const { data, error: requeueError } = await db
        .from("nanoclaw_queue")
        .update({ status: "pending", error_message: null })
        .eq("id", id)
        .eq("status", "processing")
        .select("id, status")
        .maybeSingle();

      if (requeueError) return err(requeueError.message, 500);
      if (!data)        return err("Queue item not found or not in processing state", 404);
      return json({ success: true, item: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-playbook": {
      const { client_id } = body as { client_id?: string };
      if (!client_id) return err("client_id is required");

      const { data, error } = await db
        .from("brand_twin")
        .select("*")
        .eq("client_id", client_id)
        .maybeSingle();

      if (error) return err(error.message, 500);
      return json({ success: true, playbook: data ?? null });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-playbook": {
      const {
        client_id,
        brand_basics_json,
        brand_voice_json,
        audience_json,
        offers_json,
        content_rules_json,
        source_material_json,
        visual_design_json,
        colour_direction_json,
        typography_json,
        text_on_design_json,
        composition_json,
        website_direction_json,
        social_direction_json,
        seasonal_local_json,
        cta_style_json,
        avoid_list_json,
        locked_rules_json,
        prompt_notes_json,
        formatting_rules_json,
        subject_themes_json,
      } = body as {
        client_id?: string;
        brand_basics_json?: Record<string, unknown>;
        brand_voice_json?: Record<string, unknown>;
        audience_json?: Record<string, unknown>;
        offers_json?: Record<string, unknown>;
        content_rules_json?: Record<string, unknown>;
        source_material_json?: Record<string, unknown>;
        visual_design_json?: Record<string, unknown>;
        colour_direction_json?: Record<string, unknown>;
        typography_json?: Record<string, unknown>;
        text_on_design_json?: Record<string, unknown>;
        composition_json?: Record<string, unknown>;
        website_direction_json?: Record<string, unknown>;
        social_direction_json?: Record<string, unknown>;
        seasonal_local_json?: Record<string, unknown>;
        cta_style_json?: Record<string, unknown>;
        avoid_list_json?: Record<string, unknown>;
        locked_rules_json?: Record<string, unknown>;
        prompt_notes_json?: Record<string, unknown>;
        formatting_rules_json?: Record<string, unknown>;
        subject_themes_json?: Record<string, unknown>;
      };

      if (!client_id) return err("client_id is required");

      const updates: Record<string, unknown> = { client_id, updated_at: new Date().toISOString() };
      if (brand_basics_json      !== undefined) updates.brand_basics_json      = brand_basics_json;
      if (brand_voice_json       !== undefined) updates.brand_voice_json       = brand_voice_json;
      if (audience_json          !== undefined) updates.audience_json          = audience_json;
      if (offers_json            !== undefined) updates.offers_json            = offers_json;
      if (content_rules_json     !== undefined) updates.content_rules_json     = content_rules_json;
      if (source_material_json   !== undefined) updates.source_material_json   = source_material_json;
      if (visual_design_json     !== undefined) updates.visual_design_json     = visual_design_json;
      if (colour_direction_json  !== undefined) updates.colour_direction_json  = colour_direction_json;
      if (typography_json        !== undefined) updates.typography_json        = typography_json;
      if (text_on_design_json    !== undefined) updates.text_on_design_json    = text_on_design_json;
      if (composition_json       !== undefined) updates.composition_json       = composition_json;
      if (website_direction_json !== undefined) updates.website_direction_json = website_direction_json;
      if (social_direction_json  !== undefined) updates.social_direction_json  = social_direction_json;
      if (seasonal_local_json    !== undefined) updates.seasonal_local_json    = seasonal_local_json;
      if (cta_style_json         !== undefined) updates.cta_style_json         = cta_style_json;
      if (avoid_list_json        !== undefined) updates.avoid_list_json        = avoid_list_json;
      if (locked_rules_json      !== undefined) updates.locked_rules_json      = locked_rules_json;
      if (prompt_notes_json      !== undefined) updates.prompt_notes_json      = prompt_notes_json;
      if (formatting_rules_json  !== undefined) updates.formatting_rules_json  = formatting_rules_json;
      if (subject_themes_json    !== undefined) updates.subject_themes_json    = subject_themes_json;

      if (Object.keys(updates).length <= 2) {
        // only client_id + updated_at — no fields to actually change
        return err("No playbook fields provided to update");
      }

      const { error } = await db
        .from("brand_twin")
        .upsert(updates, { onConflict: "client_id" });

      if (error) return err(error.message, 500);
      return json({ success: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "upload-image": {
      const { post_id, image_base64, filename, platform: imgPlatform, position, alt_text } = body as {
        post_id?: string;
        image_base64?: string;
        filename?: string;
        platform?: string;
        position?: number;
        alt_text?: string;
      };

      if (!post_id)       return err("post_id is required");
      if (!image_base64)  return err("image_base64 is required (base64-encoded image data)");
      if (!filename)      return err("filename is required (e.g. 'craig-fathers-day-logo.png')");

      // Decode base64 to Uint8Array
      let imageBytes: Uint8Array;
      try {
        // Strip optional data URI prefix (e.g. "data:image/png;base64,")
        const raw = image_base64.replace(/^data:image\/\w+;base64,/, "");
        const binaryStr = atob(raw);
        imageBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          imageBytes[i] = binaryStr.charCodeAt(i);
        }
      } catch (decodeErr) {
        return err(`Failed to decode base64: ${(decodeErr as Error).message}`);
      }

      // Determine content type from filename extension
      const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
      const contentTypeMap: Record<string, string> = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
        webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
      };
      const contentType = contentTypeMap[ext] ?? "image/png";

      // Upload to Supabase storage: creative-assets/posts/{post_id}/{filename}
      const storagePath = `posts/${post_id}/${filename}`;

      const { error: uploadError } = await db.storage
        .from("creative-assets")
        .upload(storagePath, imageBytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) return err(`Storage upload failed: ${uploadError.message}`, 500);

      // Get the public URL
      const { data: urlData } = db.storage
        .from("creative-assets")
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Insert into post_images table
      const { data: imgRecord, error: insertError } = await db
        .from("post_images")
        .insert({
          post_id,
          storage_path: storagePath,
          url: publicUrl,
          platform: imgPlatform ?? null,
          position: position ?? 0,
          alt_text: alt_text ?? null,
          created_by_user_id: COREY_USER_ID,
        })
        .select("id, post_id, url, storage_path, platform, position, alt_text, created_at")
        .single();

      if (insertError) return err(`post_images insert failed: ${insertError.message}`, 500);

      return json({ success: true, image: imgRecord, url: publicUrl });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "clear-post-images": {
      const { post_id } = body as { post_id?: string };
      if (!post_id) return err("post_id is required");

      // Get existing images so we can delete from storage too
      const { data: existing } = await db
        .from("post_images")
        .select("id, storage_path")
        .eq("post_id", post_id);

      if (existing && existing.length > 0) {
        // Delete from storage
        const storagePaths = existing.map((img: any) => img.storage_path).filter(Boolean);
        if (storagePaths.length > 0) {
          await db.storage.from("creative-assets").remove(storagePaths);
        }
        // Delete records
        const { error: delError } = await db
          .from("post_images")
          .delete()
          .eq("post_id", post_id);

        if (delError) return err(`Failed to delete post_images: ${delError.message}`, 500);
      }

      return json({ success: true, deleted: existing?.length ?? 0 });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "delete-post": {
      const { post_id, require_status } = body as {
        post_id?: string;
        require_status?: string;
      };

      if (!post_id) return err("post_id is required");

      let query = db.from("posts").delete().eq("id", post_id);
      if (require_status) {
        query = query.eq("status_column", require_status);
      }

      const { data, error } = await query.select("id, title, status_column").maybeSingle();

      if (error) return err(error.message, 500);
      if (!data)  return err("Post not found or status mismatch", 404);
      return json({ success: true, deleted: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "run-migration": {
      // Temporary endpoint to run schema migrations via the service role.
      // Uses Supabase's pg REST endpoint for raw SQL execution.
      const migrationStatements = [
        // 1. Make task_activity_log.user_id nullable (fixes update-task-status bug)
        `ALTER TABLE task_activity_log ALTER COLUMN user_id DROP NOT NULL`,
        // 2. Add due_at to projects table
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_at timestamptz`,
        // 3. Add blocked_by to tasks table
        `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES tasks(id)`,
      ];

      const results: { statement: string; ok: boolean; error?: string }[] = [];

      for (const sql of migrationStatements) {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey!,
          },
          body: JSON.stringify({}),
        });
        // PostgREST can't run DDL, so use the pg meta API instead
        results.push({ statement: sql, ok: false, error: "will use direct approach" });
      }

      // Direct approach: use Supabase's internal pg-meta SQL endpoint
      const allSql = migrationStatements.join(";\n") + ";";
      const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey!,
        },
        body: JSON.stringify({ query: allSql }),
      });

      if (!pgRes.ok) {
        // Fallback: try individual statements via .rpc() with a plpgsql wrapper
        // Create a temporary function to run DDL
        const rpcResults: { ok: boolean; error?: string }[] = [];
        for (const sql of migrationStatements) {
          try {
            const { error: rpcErr } = await db.rpc("exec_sql", { sql_text: sql });
            rpcResults.push({ ok: !rpcErr, error: rpcErr?.message });
          } catch (e) {
            rpcResults.push({ ok: false, error: String(e) });
          }
        }
        return json({ success: true, method: "rpc_fallback", results: rpcResults });
      }

      const pgData = await pgRes.json();
      return json({ success: true, method: "pg_query", response: pgData });
    }

    // ────────────────────────────────────────────────────────────────────────
    default:
      return err(`Unknown route "/${route}". Valid routes: GET /list-clients, POST /create-post, POST /update-post-status, POST /update-post, POST /tag-user, POST /read-posts, POST /update-doc, POST /create-task, POST /read-tasks, POST /update-task-status, POST /create-project, POST /read-projects, POST /update-project, POST /create-think-tank-item, POST /read-think-tank, POST /update-think-tank-item, POST /read-queue, POST /update-queue-item, POST /requeue-item, POST /read-playbook, POST /update-playbook, POST /upload-image, POST /delete-image, POST /delete-post`, 404);
  }
});
