import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Route-to-context mapping for page-aware prompts
function getRouteContext(route: string): { hint: string; pageLabel: string } {
  if (route.startsWith("/requests")) return { hint: "The user is viewing content requests. You can help create new ones or discuss existing ones.", pageLabel: "Requests" };
  if (route.startsWith("/approvals")) return { hint: "The user is viewing the approvals board. Help with content review questions.", pageLabel: "Approvals" };
  if (route.startsWith("/workflow")) return { hint: "The user is on the workflow board. Help with content pipeline questions.", pageLabel: "Workflow" };
  if (route.startsWith("/team/tasks")) return { hint: "The user is viewing tasks. Help query or create tasks.", pageLabel: "Tasks" };
  if (route.startsWith("/team/projects")) return { hint: "The user is viewing projects.", pageLabel: "Projects" };
  if (route.startsWith("/team/think-tank")) return { hint: "The user is viewing the Think Tank — a brainstorming space.", pageLabel: "Think Tank" };
  if (route.startsWith("/dashboard")) return { hint: "The user is on the dashboard.", pageLabel: "Dashboard" };
  if (route.startsWith("/client/success")) return { hint: "The user is on their Success Center.", pageLabel: "Success Center" };
  if (route.startsWith("/client/brand-twin")) return { hint: "The user is on the Brand Twin page, managing their brand profile.", pageLabel: "Brand Twin" };
  if (route.startsWith("/client/content-generator")) return { hint: "The user is on the Content Generator page.", pageLabel: "Content Generator" };
  return { hint: "", pageLabel: "" };
}

// Interview template voice prompts
function buildInterviewVoicePrompt(template: string, clientName: string | null, userName: string | null): { prompt: string; first_message: string } {
  const firstName = userName ? userName.split(" ")[0] : null;
  const hi = firstName ? `Hey ${firstName}!` : "Hey!";
  const clientCtx = clientName ? ` for ${clientName}` : "";

  const templates: Record<string, { prompt: string; first_message: string }> = {
    full_onboarding: {
      prompt: `You are a senior brand strategist from Stay Social conducting a comprehensive brand onboarding interview${clientCtx}. Your goal is to understand their complete brand story — business origins, values, target audience, offers, brand voice, and goals. Be warm, curious, and conversational. Ask one question at a time. Keep responses short (1-2 sentences) for natural voice flow.${firstName ? ` The client's name is ${firstName}.` : ""}`,
      first_message: `${hi} I'm so excited to learn about your brand! Let's start at the beginning — what's the story behind your business? What inspired you to start it?`,
    },
    brand_voice: {
      prompt: `You are a brand voice specialist from Stay Social conducting a focused brand voice interview${clientCtx}. Your goal is to understand how they naturally communicate — their tone, personality, phrases they use, and how they want to sound to their audience. Be friendly and conversational. Ask one question at a time. Keep responses short.${firstName ? ` The client's name is ${firstName}.` : ""}`,
      first_message: `${hi} I'm your brand voice specialist. Let's figure out how your brand really sounds. If you were describing your business to someone at a coffee shop, how would you naturally talk about it?`,
    },
    audience: {
      prompt: `You are an audience research specialist from Stay Social conducting an audience deep-dive interview${clientCtx}. Your goal is to understand their ideal customers — demographics, pain points, desires, where they hang out online, and what motivates them to buy. Be curious and insightful. Ask one question at a time. Keep responses short.${firstName ? ` The client's name is ${firstName}.` : ""}`,
      first_message: `${hi} I'm your audience research specialist. Let's talk about your dream customer. If you could describe your absolute ideal client, who are they?`,
    },
    content_strategy: {
      prompt: `You are a content strategy consultant from Stay Social conducting a content strategy session${clientCtx}. Your goal is to understand their current platforms, content approach, what's working, what's not, and their goals for content. Be strategic and encouraging. Ask one question at a time. Keep responses short.${firstName ? ` The client's name is ${firstName}.` : ""}`,
      first_message: `${hi} I'm your content strategy consultant. Let's talk about where you're showing up right now — what platforms are you currently using, and how's that going?`,
    },
    website_discovery: {
      prompt: `You are a website strategist from Stay Social conducting a website discovery session${clientCtx}. Your goal is to understand their current website situation, design preferences (colors, fonts, style), page structure, functionality needs (booking, forms, ecommerce), and inspirational sites they admire. Be practical and creative. Ask one question at a time. Keep responses short.${firstName ? ` The client's name is ${firstName}.` : ""}`,
      first_message: `${hi} I'm your website strategist. Let's talk about your website! Do you currently have one? If so, what platform is it on and what's your biggest frustration with it?`,
    },
  };

  return templates[template] || templates.full_onboarding;
}

function buildVoiceSystemPrompt(isSSRole: boolean, clientName: string | null, routeHint: string, userName?: string | null): string {
  const firstName = userName ? userName.split(" ")[0] : null;

  const base = `You are the Hub Assistant for Stay Social HUB — a social media marketing management platform that helps agencies and their clients manage content creation, approvals, and publishing.

PLATFORM CONTEXT:
- Stay Social HUB manages the full content lifecycle: requests → creation → review → approval → scheduling → publishing
- Content request types include: social posts, email campaigns, designs, videos, automation tasks, strategy work, and general requests
- "Capturing an idea" means saving a note, link, or thought to the client's Brain — a centralized intelligence repository used for content strategy
- Each client has a Brand Twin (brand profile), Strategy, and Brain in the system

YOUR PERSONALITY:
- Be warm, relaxed, and slightly casual — like a friendly coworker
- Keep responses short (1-2 sentences) so the conversation flows naturally
${firstName ? `- The user's name is ${firstName}. Address them by name occasionally to keep things personal.` : ""}

YOUR ROLE:
- You are having a natural voice conversation with the user
- Your job is to understand what they need and gather ALL relevant details
- Do NOT execute any actions — just collect information through natural conversation
- Ask clarifying questions if details are missing (type of request, priority, specific details, which client)
- When you have enough information, summarize what you'll create and let them know it will be ready for their review after the call

ENDING THE CALL:
- When you have gathered all the information and confirmed the details, wrap up naturally
- Say something like "Great, I've got everything! I'll have that ready for your review. Talk soon!"
- Do NOT keep the conversation going unnecessarily after you have all the details`;

  let roleContext: string;
  if (isSSRole) {
    roleContext = `\n\nThe user is an internal Stay Social team member. They may want to:
- Create content requests (social posts, email campaigns, designs, videos, etc.)
- Capture ideas or notes for a client's brain
- Discuss tasks or projects` +
      (clientName ? `\nThey are currently working with client: "${clientName}".` : `\nAsk which client they're working with.`);
  } else {
    roleContext = `\n\nThe user is a client. They may want to:
- Submit content requests (social posts, emails, designs, videos, or general requests)
- Share ideas or notes to save to their brain for future content` +
      (clientName ? `\nTheir business is "${clientName}".` : "");
  }

  const routeSection = routeHint ? `\n\nCurrent context: ${routeHint}` : "";

  return base + roleContext + routeSection;
}

function buildFirstMessage(isSSRole: boolean, routeHint: string, pageLabel: string, userName?: string | null): string {
  const firstName = userName ? userName.split(" ")[0] : null;
  const hi = firstName ? `Hey ${firstName}!` : "Hey!";
  const hiClient = firstName ? `Hi ${firstName}!` : "Hi!";

  if (isSSRole) {
    if (pageLabel === "Requests") return `${hi} Need to create a new request or check on existing ones?`;
    if (pageLabel === "Tasks") return `${hi} Want to create a task or look up what's on the board?`;
    if (pageLabel === "Projects") return `${hi} Need help with a project?`;
    if (pageLabel === "Workflow") return `${hi} Need help with the content pipeline?`;
    if (pageLabel === "Approvals") return `${hi} Questions about approvals or reviews?`;
    return `${hi} I'm your Hub Assistant. What can I help you with today?`;
  } else {
    if (pageLabel === "Success Center") return `${hiClient} Want to submit a content idea or have a question about your plan?`;
    if (pageLabel === "Brand Twin") return `${hiClient} Need help updating your brand profile?`;
    if (pageLabel === "Requests") return `${hiClient} Want to submit a new content request?`;
    return `${hiClient} I'm your Hub Assistant. What can I help you with?`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.claims.sub as string;

    // Get secrets
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID is not configured");
    }

    // Parse optional body
    let includePrompt = false;
    let currentRoute = "";
    let interviewTemplate = "";
    try {
      const body = await req.json();
      includePrompt = body.include_prompt === true;
      currentRoute = typeof body.current_route === "string" ? body.current_route : "";
      interviewTemplate = typeof body.interview_template === "string" ? body.interview_template : "";
    } catch {
      // No body or invalid JSON — that's fine, just get signed URL
    }

    // Generate signed URL for WebSocket connection
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(
        `ElevenLabs signed URL request failed [${response.status}]: ${errBody}`
      );
    }

    const { signed_url } = await response.json();

    // If prompt is requested, resolve user role and build it
    if (includePrompt) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const serviceClient = createClient(supabaseUrl, serviceRoleKey);

      const [profileRes, rolesRes] = await Promise.all([
        serviceClient.from("users").select("client_id, name").eq("id", userId).single(),
        serviceClient.from("user_roles").select("role").eq("user_id", userId),
      ]);

      const clientId = profileRes.data?.client_id;
      const userName = profileRes.data?.name || null;
      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const isSSRole = roles.some((r: string) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r));

      let clientName: string | null = null;
      if (clientId) {
        const { data: client } = await serviceClient.from("clients").select("name").eq("id", clientId).single();
        clientName = client?.name || null;
      }

      // If this is an interview request, use interview-specific prompts
      if (interviewTemplate) {
        const { prompt, first_message } = buildInterviewVoicePrompt(interviewTemplate, clientName, userName);
        return new Response(JSON.stringify({ signed_url, prompt, first_message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hint, pageLabel } = getRouteContext(currentRoute);
      const prompt = buildVoiceSystemPrompt(isSSRole, clientName, hint, userName);
      const first_message = buildFirstMessage(isSSRole, hint, pageLabel, userName);

      return new Response(JSON.stringify({ token: conversationToken, prompt, first_message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ token: conversationToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error generating conversation token:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
