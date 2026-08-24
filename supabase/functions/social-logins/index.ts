/**
 * social-logins — Supabase Edge Function
 *
 * Handles encrypted storage and retrieval of client social media credentials.
 * Encryption key is NEVER sent to the client — all encrypt/decrypt happens here.
 *
 * Routes (path suffix after /social-logins):
 *   POST /upsert          — save/update credentials for a platform (client-auth required)
 *   POST /get-meta        — fetch usernames + has_password flag, no decryption (client-auth required)
 *   POST /admin-list      — fetch all clients' logins with usernames (ss-role required via x-api-key)
 *   POST /copy-password   — decrypt and return a single password (ss-role required via x-api-key)
 *   POST /read-social-logins — agent bridge: returns metadata only, no passwords (api-key required)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

const err = (message: string, status = 400) =>
  json({ success: false, error: message }, status);

// ---------------------------------------------------------------------------
// Encrypt / Decrypt via pgcrypto in Postgres
// The key is read from Supabase secrets — never from client requests.
// ---------------------------------------------------------------------------

async function encryptPassword(db: ReturnType<typeof createClient>, plaintext: string, key: string): Promise<string> {
  // pgp_sym_encrypt returns bytea — we cast to text for storage
  const { data, error } = await db.rpc("pgp_sym_encrypt_text", { plaintext, key });
  if (error) throw new Error(`Encryption failed: ${error.message}`);
  return data as string;
}

async function decryptPassword(db: ReturnType<typeof createClient>, ciphertext: string, key: string): Promise<string> {
  const { data, error } = await db.rpc("pgp_sym_decrypt_text", { ciphertext, key });
  if (error) throw new Error(`Decryption failed: ${error.message}`);
  return data as string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encKey      = Deno.env.get("SOCIAL_LOGINS_KEY");
  const agentApiKey = Deno.env.get("AGENT_BRIDGE_API_KEY");

  if (!supabaseUrl || !serviceKey || !encKey) {
    return err("Server misconfiguration", 500);
  }

  // Admin/service DB client (bypasses RLS for admin routes)
  const adminDb = createClient(supabaseUrl, serviceKey);

  const url   = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).at(-1);

  // ── Agent bridge route (API key auth, no user session needed) ────────────
  if (route === "read-social-logins") {
    const providedKey = req.headers.get("x-api-key");
    if (!providedKey || providedKey !== agentApiKey) return err("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const { client_id } = body;
    if (!client_id) return err("client_id required");

    const { data, error } = await adminDb
      .from("client_social_logins")
      .select("platform, username, encrypted_password, updated_at")
      .eq("client_id", client_id)
      .order("platform");

    if (error) return err(error.message, 500);

    const result = (data ?? []).map((r: {platform: string; username: string; encrypted_password: string; updated_at: string}) => ({
      platform: r.platform,
      username: r.username,
      has_password: r.encrypted_password.length > 0,
      updated_at: r.updated_at,
    }));

    return json({ success: true, logins: result });
  }

  // ── Client-authenticated routes (JWT from browser session) ───────────────
  const authHeader = req.headers.get("authorization");

  if (route === "upsert" || route === "get-meta") {
    if (!authHeader) return err("Authorization required", 401);

    // User-scoped client — respects RLS
    const userDb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    // Get caller's user record to determine client_id
    const { data: userData, error: userError } = await userDb.auth.getUser();
    if (userError || !userData?.user) return err("Not authenticated", 401);

    const { data: profile, error: profileError } = await adminDb
      .from("users")
      .select("client_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile?.client_id) return err("No client linked to this account", 403);
    const clientId = profile.client_id;

    // ── GET-META: return usernames + has_password, no decryption ─────────
    if (route === "get-meta") {
      const { data, error } = await adminDb
        .from("client_social_logins")
        .select("platform, username, encrypted_password, updated_at, notes")
        .eq("client_id", clientId)
        .order("platform");

      if (error) return err(error.message, 500);

      const result = (data ?? []).map((r: {platform: string; username: string; encrypted_password: string; updated_at: string; notes: string}) => ({
        platform: r.platform,
        username: r.username,
        has_password: r.encrypted_password.length > 0,
        updated_at: r.updated_at,
        notes: r.notes,
      }));

      return json({ success: true, logins: result });
    }

    // ── UPSERT: encrypt password and store ────────────────────────────────
    if (route === "upsert") {
      const body = await req.json().catch(() => ({}));
      const { platform, username, password, notes } = body;

      if (!platform) return err("platform required");

      const validPlatforms = ["instagram", "facebook", "linkedin", "google", "tiktok", "other"];
      if (!validPlatforms.includes(platform)) return err("Invalid platform");

      // Get existing row to preserve password if not updating it
      const { data: existing } = await adminDb
        .from("client_social_logins")
        .select("encrypted_password")
        .eq("client_id", clientId)
        .eq("platform", platform)
        .maybeSingle();

      let encryptedPwd = existing?.encrypted_password ?? "";

      // Only encrypt if a new password was provided
      if (password && password.trim().length > 0) {
        encryptedPwd = await encryptPassword(adminDb, password, encKey);
      }

      const { error } = await adminDb
        .from("client_social_logins")
        .upsert(
          {
            client_id: clientId,
            platform,
            username: username ?? "",
            encrypted_password: encryptedPwd,
            notes: notes ?? "",
          },
          { onConflict: "client_id,platform" }
        );

      if (error) return err(error.message, 500);
      return json({ success: true });
    }
  }

  // ── Admin routes (API key auth) ──────────────────────────────────────────
  if (route === "admin-list" || route === "copy-password") {
    const providedKey = req.headers.get("x-api-key");
    if (!providedKey || providedKey !== agentApiKey) {
      // Also accept SS role via JWT for in-app admin view
      if (!authHeader) return err("Unauthorized", 401);

      const userDb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userDb.auth.getUser();
      if (!userData?.user) return err("Unauthorized", 401);

      // Check SS role
      const { data: roles } = await adminDb
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      const ssRoles = ["ss_admin", "ss_producer", "ss_ops", "ss_team", "ss_manager"];
      const isSSRole = (roles ?? []).some((r: {role: string}) => ssRoles.includes(r.role));
      if (!isSSRole) return err("Forbidden", 403);
    }

    // ── ADMIN-LIST: all clients, usernames, last updated ──────────────────
    if (route === "admin-list") {
      const body = await req.json().catch(() => ({}));
      const { client_id, platform, has_credentials } = body;

      let query = adminDb
        .from("client_social_logins")
        .select("id, client_id, platform, username, encrypted_password, updated_at, clients(name)")
        .order("updated_at", { ascending: false });

      if (client_id) query = query.eq("client_id", client_id);
      if (platform)  query = query.eq("platform", platform);

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      let result = (data ?? []).map((r: {id: string; client_id: string; platform: string; username: string; encrypted_password: string; updated_at: string; clients: {name: string} | null}) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.clients?.name ?? "Unknown",
        platform: r.platform,
        username: r.username,
        has_password: r.encrypted_password.length > 0,
        updated_at: r.updated_at,
      }));

      if (has_credentials === true) {
        result = result.filter((r: {username: string; has_password: boolean}) => r.username.length > 0 || r.has_password);
      }
      if (has_credentials === false) {
        result = result.filter((r: {username: string; has_password: boolean}) => r.username.length === 0 && !r.has_password);
      }

      return json({ success: true, logins: result, count: result.length });
    }

    // ── COPY-PASSWORD: decrypt single password, return to admin ───────────
    if (route === "copy-password") {
      const body = await req.json().catch(() => ({}));
      const { id } = body;
      if (!id) return err("id required");

      const { data, error } = await adminDb
        .from("client_social_logins")
        .select("encrypted_password, platform, clients(name)")
        .eq("id", id)
        .single();

      if (error) return err(error.message, 500);
      if (!data?.encrypted_password || data.encrypted_password.length === 0) {
        return err("No password stored for this record");
      }

      const plaintext = await decryptPassword(adminDb, data.encrypted_password, encKey);
      return json({ success: true, password: plaintext });
    }
  }

  return err("Not found", 404);
});
