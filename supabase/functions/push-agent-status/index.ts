/**
 * push-agent-status — Supabase Edge Function
 *
 * Called by NanoClaw (running locally) to publish agent status to Supabase
 * so all HUB users can see live agent state without needing localhost access.
 *
 * POST /push-agent-status
 * Headers: x-api-key: <AGENT_BRIDGE_API_KEY>
 * Body:    { agents: Array<{ id, name, role?, status, task? }> }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  // Auth — reuse the same API key as agent-bridge
  const expectedKey = Deno.env.get("AGENT_BRIDGE_API_KEY");
  if (!expectedKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration: AGENT_BRIDGE_API_KEY not set" }), { status: 500, headers: corsHeaders });
  }
  if (req.headers.get("x-api-key") !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let body: { agents?: any[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  if (!Array.isArray(body.agents)) {
    return new Response(JSON.stringify({ error: "agents array required" }), { status: 400, headers: corsHeaders });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const rows = body.agents.map((a: any) => ({
    id:         String(a.id),
    name:       String(a.name || a.id),
    role:       a.role   ?? null,
    status:     a.status ?? "offline",
    task:       a.task   ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db
    .from("agent_status")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Upsert error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ success: true, updated: rows.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
