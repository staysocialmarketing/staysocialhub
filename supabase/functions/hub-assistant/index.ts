import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUEST_TYPES = ["social_post", "email_campaign", "design", "video", "automation", "strategy", "general"];
const CAPTURE_TYPES = ["note", "link", "voice", "file"];

const tools = [
  {
    type: "function" as const,
    function: {
      name: "create_request",
      description: "Create a new content request for the client. Use when the user wants to request a social post, email campaign, design, video, automation task, strategy work, or any general content request.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "The topic/title of the request" },
          type: { type: "string", enum: REQUEST_TYPES, description: "The type of request" },
          notes: { type: "string", description: "Additional details or notes" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Priority level. Default to normal." },
        },
        required: ["topic", "type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capture_idea",
      description: "Save a quick idea, note, or link to the client's brain. Use when the user wants to jot something down or save a reference.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The idea or note content" },
          type: { type: "string", enum: CAPTURE_TYPES, description: "Type of capture. Default to note." },
          link_url: { type: "string", description: "Optional URL if the capture includes a link" },
        },
        required: ["content", "type"],
        additionalProperties: false,
      },
    },
  },
];

function buildSystemPrompt(isSSRole: boolean, clientName: string | null): string {
  const base = `You are Hub Assistant, a helpful AI assistant for the Stay Social HUB — a social media marketing management platform.

You can help users:
1. **Create content requests** — social posts, email campaigns, designs, videos, automation tasks, strategy work, or general requests
2. **Capture ideas** — quick notes, links, or thoughts to save to the client's brain

Guidelines:
- Be conversational, friendly, and concise
- Always confirm the details before executing a tool — summarize what you'll create and ask "Should I go ahead?"
- If information is missing (like request type), ask for it
- After creating something, confirm it was created successfully
- Keep responses short — 1-3 sentences max unless explaining options`;

  if (isSSRole) {
    return base + `\n\nYou are assisting an internal Stay Social team member.` +
      (clientName ? `\nThey are currently working with client: "${clientName}". Use this client for all actions unless they specify otherwise.` : `\nNo client is currently selected. Ask which client they want to work with before creating requests or captures.`);
  } else {
    return base + `\n\nYou are assisting a client user.` +
      (clientName ? `\nTheir business is "${clientName}".` : "") +
      `\nAll actions are scoped to their own account. They cannot specify a different client.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Fetch user profile + roles using service role (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const [profileRes, rolesRes] = await Promise.all([
      serviceClient.from("users").select("client_id").eq("id", userId).single(),
      serviceClient.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const clientId = profileRes.data?.client_id;
    const roles = (rolesRes.data || []).map((r: any) => r.role);
    const isSSRole = roles.some((r: string) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r));

    // Resolve client name
    let clientName: string | null = null;
    if (clientId) {
      const { data: client } = await serviceClient.from("clients").select("name").eq("id", clientId).single();
      clientName = client?.name || null;
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate message length
    const totalChars = messages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    if (totalChars > 50000) {
      return new Response(JSON.stringify({ error: "Conversation too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(isSSRole, clientName);

    // AI call with tool-calling loop
    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const MAX_TOOL_ROUNDS = 3;
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
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
        const errText = await aiResponse.text();
        console.error("AI error:", status, errText);
        throw new Error("AI request failed");
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];

      if (!choice) throw new Error("No AI response");

      const assistantMsg = choice.message;
      aiMessages.push(assistantMsg);

      // If no tool calls, we have the final response — stream it back
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        const content = assistantMsg.content || "";
        return new Response(JSON.stringify({ response: content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute tool calls
      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let args: any;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Invalid arguments" }),
          });
          continue;
        }

        let toolResult: any;

        if (fnName === "create_request") {
          // Determine which client_id to use
          let targetClientId = clientId;

          // For SS roles, if no client is set, we can't proceed
          if (!targetClientId) {
            toolResult = { error: "No client selected. Please ask which client this request is for." };
          } else {
            // Security: non-SS users can only create for their own client
            if (!isSSRole && targetClientId !== clientId) {
              toolResult = { error: "You can only create requests for your own account." };
            } else {
              const { data, error } = await serviceClient.from("requests").insert({
                topic: args.topic,
                type: args.type || "general",
                notes: args.notes || null,
                priority: args.priority || "normal",
                client_id: targetClientId,
                created_by_user_id: userId,
                source_type: "hub_assistant",
                raw_input_text: `${args.topic}${args.notes ? "\n" + args.notes : ""}`,
              }).select("id, topic, type").single();

              if (error) {
                console.error("create_request error:", error);
                toolResult = { error: "Failed to create request. Please try again." };
              } else {
                toolResult = { success: true, request_id: data.id, topic: data.topic, type: data.type };
              }
            }
          }
        } else if (fnName === "capture_idea") {
          let targetClientId = clientId;

          if (!targetClientId) {
            toolResult = { error: "No client selected. Please ask which client to save this for." };
          } else {
            if (!isSSRole && targetClientId !== clientId) {
              toolResult = { error: "You can only capture ideas for your own account." };
            } else {
              const { data, error } = await serviceClient.from("brain_captures").insert({
                content: args.content,
                type: args.type || "note",
                link_url: args.link_url || null,
                client_id: targetClientId,
                created_by_user_id: userId,
              }).select("id").single();

              if (error) {
                console.error("capture_idea error:", error);
                toolResult = { error: "Failed to save idea. Please try again." };
              } else {
                toolResult = { success: true, capture_id: data.id };
              }
            }
          }
        } else {
          toolResult = { error: `Unknown tool: ${fnName}` };
        }

        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      round++;
    }

    // Fallback if we exhaust rounds
    return new Response(JSON.stringify({ response: "I completed the actions. Is there anything else you need?" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hub-assistant error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
