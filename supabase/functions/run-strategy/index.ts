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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookUrl = Deno.env.get("STRATEGY_WEBHOOK_URL");

    // Validate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify caller has an SS role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: SS role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item_type, item_id } = await req.json();
    if (!item_type || !item_id) {
      return new Response(JSON.stringify({ error: "item_type and item_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Determine table
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

    // Fetch item
    const { data: item, error: fetchError } = await adminClient
      .from(table)
      .select("*")
      .eq("id", item_id)
      .single();
    if (fetchError || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client profile if available
    let clientProfile = null;
    const clientId = (item as any).client_id;
    if (clientId) {
      const { data: cp } = await adminClient
        .from("client_profile")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      clientProfile = cp;

      // Also fetch client name and plan
      const { data: client } = await adminClient
        .from("clients")
        .select("name, plan_id")
        .eq("id", clientId)
        .maybeSingle();
      if (client) {
        clientProfile = { ...clientProfile, client_name: client.name, plan_id: client.plan_id };
      }
    }

    // Update agent_status
    await adminClient.from(table).update({ agent_status: "pending_ai_review" } as any).eq("id", item_id);

    // Send to Zapier webhook if configured
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_type,
          item_id,
          item,
          client_profile: clientProfile,
          triggered_at: new Date().toISOString(),
        }),
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
