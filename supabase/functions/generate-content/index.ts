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
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
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

    // Fetch brand twin and client name in parallel
    const [{ data: brandTwin }, { data: client }] = await Promise.all([
      serviceClient
        .from("brand_twin")
        .select("brand_voice_json, audience_json, brand_basics_json, offers_json, content_rules_json")
        .eq("client_id", clientId)
        .single(),
      serviceClient.from("clients").select("name").eq("id", clientId).single(),
    ]);

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

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      }),
    });

    if (!anthropicResp.ok) {
      if (anthropicResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    // Transform Anthropic SSE → OpenAI-compatible SSE
    // Accumulate full text so we can save to DB on completion
    let fullText = "";
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = anthropicResp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                const text = event.delta.text;
                fullText += text;
                const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                await writer.write(encoder.encode(chunk));
              } else if (event.type === "message_stop") {
                // Save completed output to generated_content
                const { data: saved } = await serviceClient.from("generated_content").insert({
                  client_id: clientId,
                  user_id: userId,
                  content_type: content_type || "caption",
                  prompt: topic || "(auto-generated)",
                  tone_override: tone_override || null,
                  output: fullText,
                }).select("id").single();

                // Emit final metadata event so the frontend can get the record ID
                const metaChunk = `data: ${JSON.stringify({ done: true, id: saved?.id || null, client_name: client?.name || null })}\n\n`;
                await writer.write(encoder.encode(metaChunk));
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* ignore malformed SSE lines */ }
          }
        }
      } catch (err) {
        console.error("generate-content streaming error:", err);
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (err) {
    console.error("generate-content error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
