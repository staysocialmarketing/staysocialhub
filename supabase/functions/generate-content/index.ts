import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTENT_TYPES: Record<string, string> = {
  caption: "an engaging social media caption",
  email: "a marketing email body",
  blog_intro: "a blog post introduction paragraph",
  ad_copy: "short advertising copy",
  hook: "3 attention-grabbing hooks/opening lines",
  hashtags: "a set of relevant hashtags with context",
  story_ideas: "3 Instagram/TikTok story content ideas",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile
    const { data: userProfile } = await serviceClient.from("users").select("client_id").eq("id", userId).single();
    
    const body = await req.json();
    const { content_type, topic, tone_override, client_id: requestClientId } = body;

    // Determine client
    const clientId = requestClientId || userProfile?.client_id;
    if (!clientId) {
      return new Response(JSON.stringify({ error: "No client selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentDesc = CONTENT_TYPES[content_type] || "content";

    // Fetch brand twin
    const { data: brandTwin } = await serviceClient
      .from("brand_twin")
      .select("brand_voice_json, audience_json, brand_basics_json, offers_json, content_rules_json")
      .eq("client_id", clientId)
      .single();

    // Fetch client name
    const { data: client } = await serviceClient.from("clients").select("name").eq("id", clientId).single();

    // Build brand context
    let brandContext = "";
    if (brandTwin) {
      const voice = brandTwin.brand_voice_json as any;
      const audience = brandTwin.audience_json as any;
      const basics = brandTwin.brand_basics_json as any;
      const offers = brandTwin.offers_json as any;
      const rules = brandTwin.content_rules_json as any;

      brandContext = `
BRAND PROFILE for "${client?.name || "this client"}":
${basics && Object.keys(basics).length > 0 ? `Business Info: ${JSON.stringify(basics)}` : ""}
${voice && Object.keys(voice).length > 0 ? `Brand Voice & Tone: ${JSON.stringify(voice)}` : ""}
${audience && Object.keys(audience).length > 0 ? `Target Audience: ${JSON.stringify(audience)}` : ""}
${offers && Object.keys(offers).length > 0 ? `Products/Services/Offers: ${JSON.stringify(offers)}` : ""}
${rules && Object.keys(rules).length > 0 ? `Content Rules & Preferences: ${JSON.stringify(rules)}` : ""}
`.trim();
    }

    const systemPrompt = `You are a professional social media and content copywriter for Stay Social, a marketing agency. Your job is to write ${contentDesc} that is perfectly on-brand for the client.

${brandContext || "No brand profile is available yet. Write in a professional, engaging tone."}

${tone_override ? `TONE OVERRIDE: The user wants the tone to be: ${tone_override}. Adjust your writing style accordingly while staying on-brand.` : ""}

RULES:
- Write ONLY the requested content — no preamble, no "Here's your caption:", no meta-commentary
- Match the brand's voice exactly — if they're casual, be casual; if they're professional, be professional
- Make it ready to copy-paste and use immediately
- For captions: include a call-to-action when appropriate
- For emails: include subject line suggestion at the top
- Keep it authentic and human — avoid generic AI-sounding phrases`;

    const userPrompt = topic && topic.trim()
      ? `Write ${contentDesc} about: ${topic}`
      : `Write ${contentDesc} that would resonate with the target audience. Choose a relevant topic based on the brand profile.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const result = await aiResponse.json();
    const output = result.choices?.[0]?.message?.content || "";

    // Save to generated_content table
    const { data: saved, error: saveErr } = await serviceClient.from("generated_content").insert({
      client_id: clientId,
      user_id: userId,
      content_type: content_type || "caption",
      prompt: topic || "(auto-generated)",
      tone_override: tone_override || null,
      output,
    }).select("id").single();

    if (saveErr) {
      console.error("Failed to save generated content:", saveErr);
    }

    return new Response(JSON.stringify({ output, id: saved?.id || null, client_name: client?.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-content error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
