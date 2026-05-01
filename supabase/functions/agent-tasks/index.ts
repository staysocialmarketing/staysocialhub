/**
 * agent-tasks — Supabase Edge Function
 *
 * Dedicated task API for NanoClaw agents to create, read, and update HUB tasks.
 * All requests must include:  x-api-key: <AGENT_BRIDGE_API_KEY>
 *
 * Routes (path suffix after /agent-tasks):
 *   POST /create-task         — create a new task
 *   POST /read-tasks          — fetch tasks with optional filters
 *   POST /update-task-status  — update a task's status
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = "todo" | "in_progress" | "done";

const VALID_TASK_STATUSES = new Set<TaskStatus>(["todo", "in_progress", "done"]);

// Corey's user UUID — default created_by for agent-generated tasks
const COREY_USER_ID = "6cd3d0da-0cbc-4bd5-b428-9f997218f5c2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

const err = (message: string, status = 400) => json({ success: false, error: message }, status);

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const expectedKey = Deno.env.get("AGENT_BRIDGE_API_KEY");
  if (!expectedKey) return err("Server misconfiguration: AGENT_BRIDGE_API_KEY not set", 500);

  const providedKey = req.headers.get("x-api-key");
  if (!providedKey || providedKey !== expectedKey) return err("Unauthorized", 401);

  if (req.method !== "POST") return err("Method not allowed — use POST", 405);

  // ── Route ─────────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).at(-1);

  // ── Supabase admin client (bypasses RLS) ──────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return err("Server misconfiguration: Supabase environment not configured", 500);
  }
  const db = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  switch (route) {

    // ────────────────────────────────────────────────────────────────────────
    case "create-task": {
      const title            = body.title;
      const description      = body.description;
      const project_id       = body.project_id;
      const client_id        = body.client_id;
      const priority         = body.priority;
      const due_at           = body.due_at;
      const assigned_to_team = body.assigned_to_team;
      const created_by_user_id = body.created_by_user_id;

      if (typeof title !== "string" || !title.trim()) return err("title is required");
      if (assigned_to_team !== undefined && typeof assigned_to_team !== "boolean") {
        return err("assigned_to_team must be a boolean");
      }

      const { data, error } = await db
        .from("tasks")
        .insert({
          title:               title.trim(),
          description:         typeof description      === "string" ? description      : null,
          project_id:          typeof project_id       === "string" ? project_id       : null,
          client_id:           typeof client_id        === "string" ? client_id        : null,
          priority:            typeof priority         === "string" ? priority         : "normal",
          due_at:              typeof due_at           === "string" ? due_at           : null,
          assigned_to_team:    typeof assigned_to_team === "boolean" ? assigned_to_team : false,
          status:              "todo",
          created_by_user_id:  typeof created_by_user_id === "string" ? created_by_user_id : COREY_USER_ID,
        })
        .select("id, title, status, priority, created_at")
        .single();

      if (error) {
        console.error("create-task failed", error);
        return err("Failed to create task", 500);
      }
      return json({ success: true, task: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "read-tasks": {
      const client_id  = body.client_id;
      const project_id = body.project_id;
      const status     = body.status;
      const limit      = body.limit;

      if (limit !== undefined && (!Number.isInteger(limit) || (limit as number) <= 0)) {
        return err("limit must be a positive integer");
      }

      let query = db
        .from("tasks")
        .select("id, title, description, status, priority, due_at, project_id, client_id, assigned_to_team, created_by_user_id, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50);

      if (typeof client_id  === "string") query = query.eq("client_id", client_id);
      if (typeof project_id === "string") query = query.eq("project_id", project_id);
      if (typeof status     === "string") query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        console.error("read-tasks failed", error);
        return err("Failed to read tasks", 500);
      }
      return json({ success: true, tasks: data ?? [], count: (data ?? []).length });
    }

    // ────────────────────────────────────────────────────────────────────────
    case "update-task-status": {
      const task_id = body.task_id;
      const status  = body.status;

      if (typeof task_id !== "string" || !task_id.trim()) return err("task_id is required");
      if (typeof status  !== "string" || !status.trim())  return err("status is required");
      if (!VALID_TASK_STATUSES.has(status as TaskStatus)) {
        return err(`Invalid status "${status}". Valid values: ${[...VALID_TASK_STATUSES].join(", ")}`);
      }

      const { data, error } = await db
        .from("tasks")
        .update({ status })
        .eq("id", task_id)
        .select("id, title, status, updated_at")
        .maybeSingle();

      if (error) {
        console.error("update-task-status failed", error);
        return err("Failed to update task status", 500);
      }
      if (!data) return err("Task not found", 404);
      return json({ success: true, task: data });
    }

    // ────────────────────────────────────────────────────────────────────────
    default:
      return err(
        `Unknown route "/${route}". Valid routes: POST /create-task, POST /read-tasks, POST /update-task-status`,
        404,
      );
  }
});
