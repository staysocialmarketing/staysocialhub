/**
 * admin-users — Supabase Edge Function
 *
 * Privileged user management for Stay Social admins and managers.
 * Deleting a user has to go through auth.admin (service role); the
 * auth.users row cascades to public.users, user_roles and everything
 * that references the user with ON DELETE CASCADE.
 *
 * POST body:
 *   { action: "delete", user_id }
 *   { action: "update", user_id, name?, email? }
 *   { action: "set-client-status", client_id, status }   active | on_hold | archived (ss_admin)
 *   { action: "delete-client", client_id, confirm_name }  permanent, cascades (ss_admin)
 *
 * Caller must be signed in (Authorization: Bearer <jwt>) and hold
 * ss_admin or ss_manager. Only an ss_admin may delete another ss_admin.
 * Nobody can delete themselves.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

const err = (message: string, status = 400) => json({ success: false, error: message }, status);

const MANAGER_ROLES = ["ss_admin", "ss_manager"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return err("Method not allowed", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return err("Server misconfiguration", 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err("Authorization required", 401);

  // Who is calling? Resolve the JWT with the anon client so it is verified.
  const userDb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: callerData, error: callerError } = await userDb.auth.getUser();
  if (callerError || !callerData?.user) return err("Invalid session", 401);
  const caller = callerData.user;

  const adminDb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: callerRoles } = await adminDb
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .in("role", MANAGER_ROLES);
  if (!callerRoles || callerRoles.length === 0) return err("Forbidden", 403);
  const callerIsAdmin = callerRoles.some((r: { role: string }) => r.role === "ss_admin");

  let body: { action?: string; user_id?: string; name?: string; email?: string; client_id?: string; status?: string; confirm_name?: string };
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }
  const { action, user_id } = body;

  // ── Client lifecycle (ss_admin only) ─────────────────────────────────────
  const CLIENT_STATUSES = ["active", "on_hold", "archived"];
  const retireClientUsers = async (clientId: string, archive: boolean) => {
    const { data: members } = await adminDb.from("users").select("id").eq("client_id", clientId);
    for (const m of members ?? []) {
      const { error: banErr } = await adminDb.auth.admin.updateUserById(m.id, { ban_duration: archive ? "876600h" : "none" });
      if (banErr && !/not found/i.test(banErr.message)) throw new Error(`Could not ${archive ? "lock" : "unlock"} ${m.id}: ${banErr.message}`);
      await adminDb.from("users").update({ retired_at: archive ? new Date().toISOString() : null }).eq("id", m.id);
    }
    return (members ?? []).length;
  };

  if (action === "set-client-status") {
    if (!callerIsAdmin) return err("Only an admin can change a client's status", 403);
    const { client_id, status } = body;
    if (!client_id || !UUID.test(client_id)) return err("client_id is required");
    if (!status || !CLIENT_STATUSES.includes(status)) return err(`status must be one of ${CLIENT_STATUSES.join(", ")}`);
    const { error } = await adminDb.from("clients").update({ status }).eq("id", client_id);
    if (error) return err(error.message, 500);
    // Archived clients lose sign-in; back to active or on hold restores it.
    try {
      const people = await retireClientUsers(client_id, status === "archived");
      return json({ success: true, status, people });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e), 500);
    }
  }

  if (action === "delete-client") {
    if (!callerIsAdmin) return err("Only an admin can delete a client", 403);
    const { client_id, confirm_name } = body;
    if (!client_id || !UUID.test(client_id)) return err("client_id is required");
    const { data: client } = await adminDb.from("clients").select("id, name").eq("id", client_id).maybeSingle();
    if (!client) return err("Client not found", 404);
    if ((confirm_name ?? "").trim() !== client.name.trim()) return err("Type the client's name exactly to confirm");

    // People keep their accounts but lose the client and their sign-in; content goes with the client.
    let people = 0;
    try {
      people = await retireClientUsers(client_id, true);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e), 500);
    }
    await adminDb.from("users").update({ client_id: null }).eq("client_id", client_id);
    const counts: Record<string, number> = {};
    for (const table of ["posts", "tasks", "requests_archive", "nanoclaw_queue", "profile_update_requests"]) {
      const { count } = await adminDb.from(table).select("id", { count: "exact", head: true }).eq("client_id", client_id);
      counts[table] = count ?? 0;
      const { error: delErr } = await adminDb.from(table).delete().eq("client_id", client_id);
      if (delErr) return err(`${table}: ${delErr.message}`, 500);
    }
    const { error } = await adminDb.from("clients").delete().eq("id", client_id);
    if (error) return err(error.message, 500);
    return json({ success: true, deleted: client.name, people, counts });
  }
  if (!user_id || !UUID.test(user_id)) return err("user_id must be a UUID");

  const { data: targetRoles } = await adminDb.from("user_roles").select("role").eq("user_id", user_id);
  const targetIsAdmin = (targetRoles ?? []).some((r: { role: string }) => r.role === "ss_admin");
  if (targetIsAdmin && !callerIsAdmin) return err("Only an SS Admin can change another SS Admin", 403);

  if (action === "delete") {
    if (user_id === caller.id) return err("You can't delete your own account");

    // Loosen every optional reference first so a clean account can go completely.
    await adminDb.from("user_roles").delete().eq("user_id", user_id);
    await adminDb.from("posts").update({ assigned_to_user_id: null }).eq("assigned_to_user_id", user_id);
    await adminDb.from("posts").update({ reviewer_user_id: null }).eq("reviewer_user_id", user_id);
    await adminDb.from("posts").update({ created_by_user_id: null }).eq("created_by_user_id", user_id);
    await adminDb.from("post_versions").update({ created_by_user_id: null }).eq("created_by_user_id", user_id);
    await adminDb.from("profile_update_requests").update({ reviewed_by_user_id: null }).eq("reviewed_by_user_id", user_id);
    await adminDb.from("platform_versions").update({ published_by_user_id: null }).eq("published_by_user_id", user_id);
    await adminDb.from("allowed_domains").update({ added_by_user_id: null }).eq("added_by_user_id", user_id);
    await adminDb.from("users").update({ parent_user_id: null }).eq("parent_user_id", user_id);

    const { error } = await adminDb.auth.admin.deleteUser(user_id);
    if (!error) return json({ success: true, note: "deleted" });

    if (/not found/i.test(error.message)) {
      const { error: rowError } = await adminDb.from("users").delete().eq("id", user_id);
      if (rowError) return err(rowError.message, 500);
      return json({ success: true, note: "auth user was already gone; profile removed" });
    }

    // History (comments, approvals, requests) keeps its author, so retire the account instead:
    // no sign-in, no roles, no client, hidden from every list. GoTrue hides the FK detail behind
    // a generic "Database error deleting user", so anything that is not "not found" takes this path.
    if (/foreign key|violates|constraint|referenced|database error/i.test(error.message)) {
      const { error: banErr } = await adminDb.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      if (banErr) return err(banErr.message, 500);
      const { data: u } = await adminDb.from("users").select("name, email").eq("id", user_id).maybeSingle();
      const { error: rowErr } = await adminDb.from("users").update({
        client_id: null,
        retired_at: new Date().toISOString(),
        name: u?.name && !/\(removed\)$/.test(u.name) ? `${u.name} (removed)` : u?.name ?? null,
      }).eq("id", user_id);
      if (rowErr) return err(rowErr.message, 500);
      return json({ success: true, note: "retired: this person had comments or approvals on file, so the account is locked and hidden rather than erased" });
    }
    return err(error.message, 500);
  }

  if (action === "update") {
    const patch: { name?: string; email?: string } = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!EMAIL.test(email)) return err("That email doesn't look right");
      patch.email = email;
    }
    if (Object.keys(patch).length === 0) return err("Nothing to update");

    if (patch.email) {
      const { error } = await adminDb.auth.admin.updateUserById(user_id, { email: patch.email, email_confirm: true });
      if (error) return err(error.message, 500);
    }
    const { error: rowError } = await adminDb.from("users").update(patch).eq("id", user_id);
    if (rowError) return err(rowError.message, 500);
    return json({ success: true });
  }

  return err("Unknown action");
});
