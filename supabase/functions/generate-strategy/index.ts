import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch request
    const { data: request, error: reqErr } = await supabase
      .from("requests")
      .select("topic, notes, type, client_id")
      .eq("id", request_id)
      .single();
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), { status: 404, headers: corsHeaders });
    }

    // Fetch client strategy & profile in parallel
    const [strategyRes, profileRes] = await Promise.all([
      supabase.from("client_strategy").select("goals_json, pillars_json, campaigns_json, focus_json").eq("client_id", request.client_id).maybeSingle(),
      supabase.from("client_profile").select("brand_voice_json").eq("client_id", request.client_id).maybeSingle(),
    ]);

    const strategy = strategyRes.data;
    const profile = profileRes.data;

    const prompt = `You are a content strategist. Given the following request and client context, generate a structured strategy brief.

REQUEST:
- Title: ${request.topic}
- Type: ${request.type}
- Notes: ${request.notes || "None"}

CLIENT CONTEXT:
- Goals: ${JSON.stringify(strategy?.goals_json || {})}
- Content Pillars: ${JSON.stringify(strategy?.pillars_json || [])}
- Campaigns: ${JSON.stringify(strategy?.campaigns_json || [])}
- Focus: ${JSON.stringify(strategy?.focus_json || {})}
- Brand Voice: ${JSON.stringify(profile?.brand_voice_json || {})}

Return a strategy brief with these exact fields. Be specific and actionable.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a content strategist. Return structured strategy briefs." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_strategy_brief",
              description: "Return a structured strategy brief for the content request.",
              parameters: {
                type: "object",
                properties: {
                  objective: { type: "string", description: "The strategic objective for this content" },
                  angle: { type: "string", description: "The content angle or approach" },
                  primary_message: { type: "string", description: "The primary message to communicate" },
                  audience: { type: "string", description: "The target audience" },
                  campaign: { type: "string", description: "Related campaign or initiative" },
                  cta: { type: "string", description: "The call to action" },
                  production_notes: { type: "string", description: "Notes for the production team" },
                },
                required: ["objective", "angle", "primary_message", "audience", "campaign", "cta", "production_notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_strategy_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: corsHeaders });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: corsHeaders });
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), { status: 500, headers: corsHeaders });
    }

    const brief = JSON.parse(toolCall.function.arguments);

    // Write back to requests table
    const { error: updateErr } = await supabase
      .from("requests")
      .update({ strategy_brief: brief })
      .eq("id", request_id);

    if (updateErr) {
      console.error("Failed to save brief:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save strategy brief" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
