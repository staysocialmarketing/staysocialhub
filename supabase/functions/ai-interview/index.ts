import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PACING_RULES = `

PACING RULES (critical — you MUST follow these):
- Ask exactly ONE question per response. Never two. Never sneak in a second question.
- Keep your response to 1-2 short sentences of acknowledgment, then your single question.
- Do NOT list multiple things to answer. One topic, one question.
- Wait for their full answer before moving to the next topic.
- Never rush — let the conversation breathe.`;

const INTERVIEW_TEMPLATES: Record<string, string> = {
  full_onboarding: `You are a senior brand strategist conducting a comprehensive onboarding interview for a social media marketing agency called Stay Social. Your goal is to deeply understand this client's brand so the team can create authentic, on-brand content.

Interview flow:
1. Start with warm introductions and ask about their business story
2. Explore their brand voice and personality
3. Understand their target audience deeply
4. Learn about their offers, services, and what they want to promote
5. Discuss content preferences, platforms, and any rules/restrictions
${PACING_RULES}

Guidelines:
- Be conversational and warm, not robotic
- Mirror their energy and language style
- After 8-12 exchanges, summarize what you've learned and ask if anything is missing

Your FIRST message should warmly introduce yourself as a senior brand strategist from Stay Social and ask ONE simple question: what does their business do?`,

  brand_voice: `You are a brand voice specialist interviewing a client to define their unique communication style. Focus exclusively on:
- How they naturally speak and write
- Words and phrases they love vs. avoid
- Their brand personality (formal/casual, serious/playful, etc.)
- Their tone across different contexts
- Their unique positioning and messaging
${PACING_RULES}

After 6-8 exchanges, summarize the voice profile.

Your FIRST message should introduce yourself as a brand voice specialist from Stay Social and ask ONE question: how would they describe what they do if they bumped into someone at a coffee shop?`,

  audience: `You are an audience research specialist. Interview the client to deeply understand:
- Who their ideal customers are (demographics, psychographics)
- What problems these customers face
- Common objections and hesitations
- What outcomes customers desire
- Where these customers spend time online
- What the audience should FEEL when they encounter this brand (trust, clarity, excitement, calm, confidence)
${PACING_RULES}

After 6-8 exchanges, summarize the audience profile.

Your FIRST message should introduce yourself as an audience research specialist from Stay Social and ask ONE question: who is their absolute dream customer?`,

  content_strategy: `You are a content strategy consultant. Interview the client about:
- What platforms they use and why
- Content types that have worked well
- Posting frequency goals
- Any compliance or industry restrictions
- Topics they want to be known for
- Seasonal or campaign-based content needs
${PACING_RULES}

After 6-8 exchanges, summarize the content strategy.

Your FIRST message should introduce yourself as a content strategy consultant from Stay Social and ask ONE question: what social platforms are they currently active on?`,

  website_discovery: `You are a website strategist and designer conducting a discovery interview for a social media marketing agency called Stay Social that also builds websites. Your goal is to understand exactly what the client needs for their website so the team can design and build it.

Interview flow:
1. Start by asking about their current website situation
2. Explore their design preferences (modern, clean, bold, elegant, playful — colors, fonts, mood)
3. Understand the pages they need and the purpose of each
4. Discuss functionality requirements (booking/scheduling, forms, ecommerce, galleries, blog, memberships, etc.)
5. Ask about integrations they need (CRM, email marketing, scheduling tools, payment processors)
6. Learn about inspiration — websites they admire and why
7. Understand content readiness (do they have copy, photos, videos, or will they need help?)
${PACING_RULES}

After 8-12 exchanges, summarize the website brief and ask if anything is missing.

Your FIRST message should introduce yourself as a website strategist from Stay Social and ask ONE question: do they currently have a website?`,

  visual_brand: `You are a visual brand director and design strategist conducting a deep discovery interview for a social media marketing agency called Stay Social. Your goal is to understand the client's complete visual identity so the team can create perfectly on-brand designs, AI-generated images, social graphics, and web layouts.

Interview flow (follow this order, ONE question at a time):

Phase 1 — Visual Style:
- Do they prefer bold ad-style creative or softer lifestyle content?
- Should visuals feel more like premium advertising, editorial branding, or personal content?
- Clean and minimal, or layered and high-impact?

Phase 2 — Colour Behaviour:
- Describe their brand colours in plain language (not just hex codes — the mood and feel)
- Which colour should dominate?
- Which are accent-only?
- Any tones they dislike even if close to their brand colours?

Phase 3 — Typography + Text-on-Design:
- What kind of font feel do they prefer? (bold sans-serif, elegant serif, modern geometric)
- How much text belongs on graphics vs in captions?
- Headline-only, or supporting text too?

Phase 4 — Web + Social Application:
- Should their website and social visuals feel the same or slightly different?
- What's the visual priority on the website — trust, luxury, simplicity, or conversion?
- For social posts — cleaner headline-driven graphics or text-heavy educational content?

Phase 5 — Subject Matter + Seasonal:
- What kind of people, settings, or scenes should appear in visuals?
- Any local or regional identity to reflect?
- Should content reflect seasons? Subtly or strongly?

Phase 6 — Negative Direction + Avoid List:
- What feels off-brand visually?
- Specific colours, tones, or styles to absolutely avoid?
- What "bad" design looks like for this brand
${PACING_RULES}

Guidelines:
- Be conversational and warm, not robotic
- Use plain language — avoid design jargon unless the client uses it
- After 10-14 exchanges, summarize the visual direction and ask if anything is missing

Your FIRST message should warmly introduce yourself as a visual brand director from Stay Social and ask ONE question: how do they want their brand to feel when someone lands on their website or sees their content for the first time?`,
};

const EXTRACTION_PROMPT = `You are a data extraction specialist. Analyze the following interview conversation and extract structured brand intelligence data.

Return a JSON object using tool calling with ONLY the fields you have clear information about. Do not guess or fabricate data.

The fields should map to these Brand Twin sections:
- brand_basics: business_name, industry, region, website, primary_contact
- brand_voice: tone, writing_style, messaging_style, cta_style, key_phrases (array), avoid_phrases (array), positioning
- audience: primary, secondary, pain_points, objections, desired_outcomes, target_emotional_response, trust_signals, first_impression, engagement_drivers
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

const VISUAL_BRAND_EXTRACTION_PROMPT = `You are a data extraction specialist. Analyze the following visual brand interview conversation and extract structured visual identity data.

Return a JSON object using tool calling with ONLY the fields you have clear information about. Do not guess or fabricate data.

Extract data for these sections:
- visual_design: design_style, social_visual_style, website_visual_style, photo_realism, brand_polish_level
- colour_direction: primary_colour_mood, accent_colour_mood, dominant, supporting (array), avoid (array), descriptions
- typography: font_feel, headline_style, supporting_text_style, text_density, caps_preference, bold_vs_subtle
- text_on_design: headline_only_vs_multiline, educational_on_graphics, subtitles_ok, caption_carries_message
- composition: focal_point, single_vs_split_scene, text_room, subject_placement, mobile_priority
- social_direction: post_style, ad_style, carousel_style, quote_post_look, educational_graphic_rules, consistency_system
- website_direction: homepage_mood, hero_style, section_density, luxury_vs_clarity, lead_gen_vs_credibility
- subject_themes: people_types, home_style, business_setting, city_elements, lifestyle_cues, symbolic_themes
- seasonal_local: local_region, neighbourhood_vibe, urban_vs_suburban, seasonal_reflection, seasonal_strength, weather_cues, holiday_style
- cta_style: strong_vs_soft, educational_vs_conversion, preferred_phrasing, salesiness_threshold
- formatting_rules: bullet_style, emoji_level, hashtag_count, contact_info_rules, platform_tone
- avoid_list: visual_dislikes (array), colour_dislikes (array), tone_dislikes (array), bad_fit_styles (array), overused_trends (array)`;

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
              target_emotional_response: { type: "string" },
              trust_signals: { type: "string" },
              first_impression: { type: "string" },
              engagement_drivers: { type: "string" },
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

const VISUAL_BRAND_EXTRACT_TOOLS = [
  {
    type: "function",
    function: {
      name: "extract_visual_brand_data",
      description: "Extract structured visual brand identity data from conversation",
      parameters: {
        type: "object",
        properties: {
          visual_design: {
            type: "object",
            properties: {
              design_style: { type: "string" },
              social_visual_style: { type: "string" },
              website_visual_style: { type: "string" },
              photo_realism: { type: "string" },
              brand_polish_level: { type: "string" },
            },
          },
          colour_direction: {
            type: "object",
            properties: {
              primary_colour_mood: { type: "string" },
              accent_colour_mood: { type: "string" },
              dominant: { type: "string" },
              supporting: { type: "array", items: { type: "string" } },
              avoid: { type: "array", items: { type: "string" } },
              descriptions: { type: "string" },
            },
          },
          typography: {
            type: "object",
            properties: {
              font_feel: { type: "string" },
              headline_style: { type: "string" },
              supporting_text_style: { type: "string" },
              text_density: { type: "string" },
              caps_preference: { type: "string" },
              bold_vs_subtle: { type: "string" },
            },
          },
          text_on_design: {
            type: "object",
            properties: {
              headline_only_vs_multiline: { type: "string" },
              educational_on_graphics: { type: "string" },
              subtitles_ok: { type: "string" },
              caption_carries_message: { type: "string" },
            },
          },
          composition: {
            type: "object",
            properties: {
              focal_point: { type: "string" },
              single_vs_split_scene: { type: "string" },
              text_room: { type: "string" },
              subject_placement: { type: "string" },
              mobile_priority: { type: "string" },
            },
          },
          social_direction: {
            type: "object",
            properties: {
              post_style: { type: "string" },
              ad_style: { type: "string" },
              carousel_style: { type: "string" },
              quote_post_look: { type: "string" },
              educational_graphic_rules: { type: "string" },
              consistency_system: { type: "string" },
            },
          },
          website_direction: {
            type: "object",
            properties: {
              homepage_mood: { type: "string" },
              hero_style: { type: "string" },
              section_density: { type: "string" },
              luxury_vs_clarity: { type: "string" },
              lead_gen_vs_credibility: { type: "string" },
            },
          },
          subject_themes: {
            type: "object",
            properties: {
              people_types: { type: "string" },
              home_style: { type: "string" },
              business_setting: { type: "string" },
              city_elements: { type: "string" },
              lifestyle_cues: { type: "string" },
              symbolic_themes: { type: "string" },
            },
          },
          seasonal_local: {
            type: "object",
            properties: {
              local_region: { type: "string" },
              neighbourhood_vibe: { type: "string" },
              urban_vs_suburban: { type: "string" },
              seasonal_reflection: { type: "string" },
              seasonal_strength: { type: "string" },
              weather_cues: { type: "string" },
              holiday_style: { type: "string" },
            },
          },
          cta_style: {
            type: "object",
            properties: {
              strong_vs_soft: { type: "string" },
              educational_vs_conversion: { type: "string" },
              preferred_phrasing: { type: "string" },
              salesiness_threshold: { type: "string" },
            },
          },
          formatting_rules: {
            type: "object",
            properties: {
              bullet_style: { type: "string" },
              emoji_level: { type: "string" },
              hashtag_count: { type: "string" },
              contact_info_rules: { type: "string" },
              platform_tone: { type: "string" },
            },
          },
          avoid_list: {
            type: "object",
            properties: {
              visual_dislikes: { type: "array", items: { type: "string" } },
              colour_dislikes: { type: "array", items: { type: "string" } },
              tone_dislikes: { type: "array", items: { type: "string" } },
              bad_fit_styles: { type: "array", items: { type: "string" } },
              overused_trends: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
];

const WEBSITE_TEMPLATES = new Set(["website_discovery"]);
const VISUAL_BRAND_TEMPLATES = new Set(["visual_brand"]);

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
    const isVisualBrandTemplate = VISUAL_BRAND_TEMPLATES.has(template || "");

    if (action === "extract") {
      // Extract structured data from conversation
      const conversationText = (messages || [])
        .map((m: any) => `${m.role === "user" ? "Interviewer" : "Client"}: ${m.content}`)
        .join("\n\n");

      let extractionPrompt: string;
      let extractionTools: any[];
      let toolName: string;

      if (isVisualBrandTemplate) {
        extractionPrompt = VISUAL_BRAND_EXTRACTION_PROMPT;
        extractionTools = VISUAL_BRAND_EXTRACT_TOOLS;
        toolName = "extract_visual_brand_data";
      } else if (isWebsiteTemplate) {
        extractionPrompt = WEBSITE_EXTRACTION_PROMPT;
        extractionTools = WEBSITE_EXTRACT_TOOLS;
        toolName = "extract_website_data";
      } else {
        extractionPrompt = EXTRACTION_PROMPT;
        extractionTools = BRAND_EXTRACT_TOOLS;
        toolName = "extract_brand_data";
      }

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

      return new Response(JSON.stringify({ extracted_data: extractedData, is_website: isWebsiteTemplate, is_visual_brand: isVisualBrandTemplate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: streaming chat
    const templateKey = template || "full_onboarding";
    const systemPrompt = INTERVIEW_TEMPLATES[templateKey] || INTERVIEW_TEMPLATES.full_onboarding;

    // Fetch existing Brand Twin data for context
    let brandContext = "";
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Onboarding pre-check for non-full templates
    let onboardingPreCheck = "";
    if (templateKey !== "full_onboarding" && client_id) {
      const { data: completedOnboarding } = await serviceClient
        .from("brain_interviews")
        .select("id")
        .eq("client_id", client_id)
        .eq("template", "full_onboarding")
        .eq("status", "extracted")
        .limit(1);

      if (!completedOnboarding || completedOnboarding.length === 0) {
        onboardingPreCheck = `\n\nIMPORTANT: Before diving into this focused interview, check if the client has already completed the full onboarding interview. In your FIRST message, warmly ask: "Before we get started, have you already done the full brand onboarding interview with us? If not, I'd recommend doing that first since it covers your brand voice, audience, and goals — which helps us with everything else. Would you like to do that first, or continue with this focused session?" If they want to continue, proceed normally. If they want onboarding first, let them know to start a new "Full Onboarding" interview from the template picker.`;
      }
    }

    if (client_id) {
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
          if (bt.visual_design_json && Object.keys(bt.visual_design_json).length > 0) {
            brandContext += `Visual design: ${JSON.stringify(bt.visual_design_json)}\n`;
          }
          if (bt.colour_direction_json && Object.keys(bt.colour_direction_json).length > 0) {
            brandContext += `Colour direction: ${JSON.stringify(bt.colour_direction_json)}\n`;
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
      { role: "system", content: systemPrompt + onboardingPreCheck + brandContext },
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
