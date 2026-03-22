import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INTERVIEW_TEMPLATES: Record<string, string> = {
  full_onboarding: `You are a senior brand strategist conducting a comprehensive onboarding interview for a social media marketing agency called Stay Social. Your goal is to deeply understand this client's brand so the team can create authentic, on-brand content.

Interview flow:
1. Start with warm introductions and ask about their business story
2. Explore their brand voice and personality
3. Understand their target audience deeply
4. Learn about their offers, services, and what they want to promote
5. Discuss content preferences, platforms, and any rules/restrictions

Guidelines:
- Ask ONE focused question at a time
- Use follow-up questions to dig deeper on interesting points
- Be conversational and warm, not robotic
- Mirror their energy and language style
- After 8-12 exchanges, summarize what you've learned and ask if anything is missing
- Keep responses concise (2-3 sentences max before your question)`,

  brand_voice: `You are a brand voice specialist interviewing a client to define their unique communication style. Focus exclusively on:
- How they naturally speak and write
- Words and phrases they love vs. avoid
- Their brand personality (formal/casual, serious/playful, etc.)
- Their tone across different contexts
- Their unique positioning and messaging

Ask ONE question at a time. Be conversational. After 6-8 exchanges, summarize the voice profile.`,

  audience: `You are an audience research specialist. Interview the client to deeply understand:
- Who their ideal customers are (demographics, psychographics)
- What problems these customers face
- Common objections and hesitations
- What outcomes customers desire
- Where these customers spend time online

Ask ONE question at a time. Be curious and specific. After 6-8 exchanges, summarize the audience profile.`,

  content_strategy: `You are a content strategy consultant. Interview the client about:
- What platforms they use and why
- Content types that have worked well
- Posting frequency goals
- Any compliance or industry restrictions
- Topics they want to be known for
- Seasonal or campaign-based content needs

Ask ONE question at a time. Be practical and actionable. After 6-8 exchanges, summarize the content strategy.`,

  website_discovery: `You are a website strategist and designer conducting a discovery interview for a social media marketing agency called Stay Social that also builds websites. Your goal is to understand exactly what the client needs for their website so the team can design and build it.

Interview flow:
1. Start by asking about their current website situation (do they have one? what platform? what's working/not working?)
2. Explore their design preferences (modern, clean, bold, elegant, playful — ask about colors, fonts, and mood)
3. Understand the pages they need and the purpose of each
4. Discuss functionality requirements (booking/scheduling, forms, ecommerce, galleries, blog, memberships, etc.)
5. Ask about integrations they need (CRM, email marketing, scheduling tools, payment processors)
6. Learn about inspiration — websites they admire and why
7. Understand content readiness (do they have copy, photos, videos, or will they need help?)

Guidelines:
- Ask ONE focused question at a time
- Be specific — ask "what color palette resonates with your brand?" not just "what do you like?"
- Use follow-up questions when they mention something interesting
- Be conversational and warm
- After 8-12 exchanges, summarize the website brief and ask if anything is missing
- Keep responses concise (2-3 sentences max before your question)`,
};

const EXTRACTION_PROMPT = `You are a data extraction specialist. Analyze the following interview conversation and extract structured brand intelligence data.

Return a JSON object using tool calling with ONLY the fields you have clear information about. Do not guess or fabricate data.

The fields should map to these Brand Twin sections:
- brand_basics: business_name, industry, region, website, primary_contact
- brand_voice: tone, writing_style, messaging_style, cta_style, key_phrases (array), avoid_phrases (array), positioning
- audience: primary, secondary, pain_points, objections, desired_outcomes
- offers: main_services (array), key_offers (array), priority_services (array), seasonal_focus
- content_rules: platforms (array), content_types (array), posting_goals, compliance, do_dont`;

const WEBSITE_EXTRACTION_PROMPT = `You are a data extraction specialist. Analyze the following website discovery interview and extract structured website brief data.

Return a JSON object using tool calling with ONLY the fields you have clear information about. Do not guess or fabricate data.

The fields should map to these Website Brief sections:
- design: color_palette (array of colors mentioned), font_preferences (array), style_mood (e.g. modern, elegant, bold), brand_aesthetic, visual_references
- layout: pages_needed (array of page names), navigation_style, hero_style, key_sections (array), sitemap_notes
- functionality: booking_system, forms_needed (array), ecommerce, blog, gallery, memberships, other_features (array)
- content: has_copy (boolean), has_photos (boolean), has_videos (boolean), content_needs (array), copywriting_notes
- inspiration: reference_sites (array of {url, what_they_like}), dislikes, overall_direction`;

const BRAND_EXTRACT_TOOLS = [
  {
    type: "function",
    function: {
      name: "extract_brand_data",
      description: "Extract structured brand intelligence from conversation",
      parameters: {
        type: "object",
        properties: {
          brand_basics: {
            type: "object",
            properties: {
              business_name: { type: "string" },
              industry: { type: "string" },
              region: { type: "string" },
              website: { type: "string" },
              primary_contact: { type: "string" },
            },
          },
          brand_voice: {
            type: "object",
            properties: {
              tone: { type: "string" },
              writing_style: { type: "string" },
              messaging_style: { type: "string" },
              cta_style: { type: "string" },
              key_phrases: { type: "array", items: { type: "string" } },
              avoid_phrases: { type: "array", items: { type: "string" } },
              positioning: { type: "string" },
            },
          },
          audience: {
            type: "object",
            properties: {
              primary: { type: "string" },
              secondary: { type: "string" },
              pain_points: { type: "string" },
              objections: { type: "string" },
              desired_outcomes: { type: "string" },
            },
          },
          offers: {
            type: "object",
            properties: {
              main_services: { type: "array", items: { type: "string" } },
              key_offers: { type: "array", items: { type: "string" } },
              priority_services: { type: "array", items: { type: "string" } },
              seasonal_focus: { type: "string" },
            },
          },
          content_rules: {
            type: "object",
            properties: {
              platforms: { type: "array", items: { type: "string" } },
              content_types: { type: "array", items: { type: "string" } },
              posting_goals: { type: "string" },
              compliance: { type: "string" },
              do_dont: { type: "string" },
            },
          },
        },
      },
    },
  },
];

const WEBSITE_EXTRACT_TOOLS = [
  {
    type: "function",
    function: {
      name: "extract_website_data",
      description: "Extract structured website brief data from conversation",
      parameters: {
        type: "object",
        properties: {
          design: {
            type: "object",
            properties: {
              color_palette: { type: "array", items: { type: "string" } },
              font_preferences: { type: "array", items: { type: "string" } },
              style_mood: { type: "string" },
              brand_aesthetic: { type: "string" },
              visual_references: { type: "string" },
            },
          },
          layout: {
            type: "object",
            properties: {
              pages_needed: { type: "array", items: { type: "string" } },
              navigation_style: { type: "string" },
              hero_style: { type: "string" },
              key_sections: { type: "array", items: { type: "string" } },
              sitemap_notes: { type: "string" },
            },
          },
          functionality: {
            type: "object",
            properties: {
              booking_system: { type: "string" },
              forms_needed: { type: "array", items: { type: "string" } },
              ecommerce: { type: "string" },
              blog: { type: "string" },
              gallery: { type: "string" },
              memberships: { type: "string" },
              other_features: { type: "array", items: { type: "string" } },
            },
          },
          content: {
            type: "object",
            properties: {
              has_copy: { type: "boolean" },
              has_photos: { type: "boolean" },
              has_videos: { type: "boolean" },
              content_needs: { type: "array", items: { type: "string" } },
              copywriting_notes: { type: "string" },
            },
          },
          inspiration: {
            type: "object",
            properties: {
              reference_sites: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    what_they_like: { type: "string" },
                  },
                },
              },
              dislikes: { type: "string" },
              overall_direction: { type: "string" },
            },
          },
        },
      },
    },
  },
];

const WEBSITE_TEMPLATES = new Set(["website_discovery"]);

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const userId = claimsData.claims.sub as string;

    // Verify SS role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, client_id, messages, template, interview_id } = body;

    const isWebsiteTemplate = WEBSITE_TEMPLATES.has(template || "");

    if (action === "extract") {
      // Extract structured data from conversation
      const conversationText = (messages || [])
        .map((m: any) => `${m.role === "user" ? "Interviewer" : "Client"}: ${m.content}`)
        .join("\n\n");

      const extractionPrompt = isWebsiteTemplate ? WEBSITE_EXTRACTION_PROMPT : EXTRACTION_PROMPT;
      const extractionTools = isWebsiteTemplate ? WEBSITE_EXTRACT_TOOLS : BRAND_EXTRACT_TOOLS;
      const toolName = isWebsiteTemplate ? "extract_website_data" : "extract_brand_data";

      const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: extractionPrompt },
            { role: "user", content: conversationText },
          ],
          tools: extractionTools,
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });

      if (!extractionResponse.ok) {
        const status = extractionResponse.status;
        const errText = await extractionResponse.text();
        console.error("Extraction error:", status, errText);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Extraction failed");
      }

      const extractionResult = await extractionResponse.json();
      const toolCall = extractionResult.choices?.[0]?.message?.tool_calls?.[0];
      let extractedData = {};
      if (toolCall?.function?.arguments) {
        try {
          extractedData = JSON.parse(toolCall.function.arguments);
        } catch {
          extractedData = {};
        }
      }

      return new Response(JSON.stringify({ extracted_data: extractedData, is_website: isWebsiteTemplate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: streaming chat
    const templateKey = template || "full_onboarding";
    const systemPrompt = INTERVIEW_TEMPLATES[templateKey] || INTERVIEW_TEMPLATES.full_onboarding;

    // Fetch existing Brand Twin data for context
    let brandContext = "";
    if (client_id) {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: brandTwin } = await serviceClient
        .from("brand_twin")
        .select("*")
        .eq("client_id", client_id)
        .maybeSingle();

      const { data: client } = await serviceClient
        .from("clients")
        .select("name")
        .eq("id", client_id)
        .maybeSingle();

      if (brandTwin || client) {
        brandContext = `\n\nExisting client information:\nClient name: ${client?.name || "Unknown"}\n`;
        if (brandTwin) {
          const bt = brandTwin as any;
          if (bt.brand_basics_json && Object.keys(bt.brand_basics_json).length > 0) {
            brandContext += `Brand basics: ${JSON.stringify(bt.brand_basics_json)}\n`;
          }
          if (bt.brand_voice_json && Object.keys(bt.brand_voice_json).length > 0) {
            brandContext += `Brand voice: ${JSON.stringify(bt.brand_voice_json)}\n`;
          }
        }
        brandContext += "\nUse this context to ask more relevant questions and avoid repeating what you already know. Reference their specifics when asking follow-ups.";
      }

      // For website discovery, also fetch existing website brief
      if (isWebsiteTemplate) {
        const { data: websiteBrief } = await serviceClient
          .from("website_briefs")
          .select("*")
          .eq("client_id", client_id)
          .maybeSingle();

        if (websiteBrief) {
          const wb = websiteBrief as any;
          brandContext += "\n\nExisting website brief data:\n";
          if (wb.design_json && Object.keys(wb.design_json).length > 0) {
            brandContext += `Design preferences: ${JSON.stringify(wb.design_json)}\n`;
          }
          if (wb.layout_json && Object.keys(wb.layout_json).length > 0) {
            brandContext += `Layout/pages: ${JSON.stringify(wb.layout_json)}\n`;
          }
          if (wb.functionality_json && Object.keys(wb.functionality_json).length > 0) {
            brandContext += `Functionality: ${JSON.stringify(wb.functionality_json)}\n`;
          }
        }
      }
    }

    const aiMessages = [
      { role: "system", content: systemPrompt + brandContext },
      ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI request failed");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("ai-interview error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
