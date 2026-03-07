import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate with service role key via Authorization header
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item_type, item_id, ai_fields, strategy_brief } = await req.json();

    if (!item_type || !item_id) {
      return new Response(JSON.stringify({ error: "item_type and item_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableMap: Record<string, string> = {
      task: "tasks",
      request: "requests",
      think_tank: "think_tank_items",
    };
    const table = tableMap[item_type];
    if (!table) {
      return new Response(JSON.stringify({ error: "Invalid item_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Build update payload from allowed AI fields
    const allowedKeys = [
      "ai_summary", "ai_suggested_client", "ai_suggested_content_type",
      "ai_suggested_priority", "ai_suggested_assignee", "ai_suggested_project",
      "ai_suggested_subproject", "ai_suggested_next_action", "ai_suggested_item_type",
      "agent_status", "agent_confidence", "voice_transcript",
    ];

    const updatePayload: Record<string, unknown> = {};
    if (ai_fields && typeof ai_fields === "object") {
      for (const key of allowedKeys) {
        if (key in ai_fields) {
          updatePayload[key] = ai_fields[key];
        }
      }
    }
    if (strategy_brief) {
      updatePayload.strategy_brief = strategy_brief;
    }
    if (!updatePayload.agent_status) {
      updatePayload.agent_status = "ai_processed";
    }

    const { error } = await adminClient.from(table).update(updatePayload as any).eq("id", item_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
