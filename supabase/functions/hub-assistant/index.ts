import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUEST_TYPES = ["social_post", "email_campaign", "design", "video", "automation", "strategy", "general"];
const CAPTURE_TYPES = ["note", "link", "voice", "file"];

const baseTools = [
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
          client_name: { type: "string", description: "Name of the client this request is for. Required if the user specifies a client by name." },
          assigned_to_name: { type: "string", description: "Name of the person to assign the request to, if mentioned." },
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
          client_name: { type: "string", description: "Name of the client to save this for. Required if the user specifies a client by name." },
        },
        required: ["content", "type"],
        additionalProperties: false,
      },
    },
  },
];

const ssOnlyTools = [
  {
    type: "function" as const,
    function: {
      name: "query_tasks",
      description: "Search and list tasks. Use when the user asks about tasks, to-dos, or work items. Returns up to 20 results.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Filter by client name (partial match)" },
          status: { type: "string", enum: ["todo", "in_progress", "done", "blocked"], description: "Filter by status" },
          assignee_name: { type: "string", description: "Filter by assignee name (partial match)" },
          search: { type: "string", description: "Search in task title" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_projects",
      description: "Search and list projects. Use when the user asks about projects or wants to see what projects exist.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Filter by client name (partial match)" },
          status: { type: "string", enum: ["active", "completed", "archived"], description: "Filter by status" },
          search: { type: "string", description: "Search in project name" },
        },
        additionalProperties: false,
      },
    },
  },
];

function getRouteContext(route: string): string {
  if (!route) return "";
  if (route.startsWith("/requests")) return "\nThe user is currently viewing content requests. You can help create new ones or discuss existing ones.";
  if (route.startsWith("/approvals")) return "\nThe user is viewing the approvals board. Help with content review questions.";
  if (route.startsWith("/workflow")) return "\nThe user is on the workflow board. Help with content pipeline questions.";
  if (route.startsWith("/team/tasks")) return "\nThe user is viewing tasks. Help query or create tasks.";
  if (route.startsWith("/team/projects")) return "\nThe user is viewing projects.";
  if (route.startsWith("/team/think-tank")) return "\nThe user is viewing the Think Tank — a brainstorming space.";
  if (route.startsWith("/dashboard")) return "\nThe user is on the dashboard.";
  if (route.startsWith("/client/success")) return "\nThe user is on their Success Center.";
  if (route.startsWith("/client/brand-twin")) return "\nThe user is on the Brand Twin page.";
  return "";
}

function buildSystemPrompt(isSSRole: boolean, clientName: string | null, currentRoute?: string): string {
  const base = `You are Hub Assistant, a helpful AI assistant for the Stay Social HUB — a social media marketing management platform.

Guidelines:
- Be conversational, friendly, and concise
- Always confirm the details before executing a tool — summarize what you'll create and ask "Should I go ahead?"
- If information is missing (like request type), ask for it
- After creating something, confirm it was created successfully
- Keep responses short — 1-3 sentences max unless explaining options`;

  const routeHint = getRouteContext(currentRoute || "");

  if (isSSRole) {
    return base + `\n\nYou are assisting an internal Stay Social team member. You can help them:
1. **Create content requests** — social posts, email campaigns, designs, videos, automation tasks, strategy work, or general requests
2. **Capture ideas** — quick notes, links, or thoughts to save to a client's brain
3. **Query tasks** — search and list tasks by client, status, or assignee
4. **Query projects** — search and list projects by client or status` +
      (clientName ? `\nThey are currently working with client: "${clientName}". Use this client for all actions unless they specify otherwise.` : `\nNo client is currently selected. Ask which client they want to work with before creating requests or captures.`) +
      routeHint;
  } else {
    return base + `\n\nYou are assisting a client user. You can help them:
1. **Create content requests** — social posts, email campaigns, designs, videos, or general requests
2. **Capture ideas** — quick notes, links, or thoughts to save to their brain

You do NOT have access to internal tasks, projects, team data, or any information beyond this client's own account.` +
      (clientName ? `\nTheir business is "${clientName}".` : "") +
      `\nAll actions are scoped to their own account. They cannot specify a different client.` +
      routeHint;
  }
}

function buildVoiceSystemPrompt(isSSRole: boolean, clientName: string | null, currentRoute?: string): string {
  const base = `You are the Hub Assistant for Stay Social HUB — a social media marketing management platform that helps agencies and their clients manage content creation, approvals, and publishing.

PLATFORM CONTEXT:
- Stay Social HUB manages the full content lifecycle: requests → creation → review → approval → scheduling → publishing
- Content request types include: social posts, email campaigns, designs, videos, automation tasks, strategy work, and general requests
- "Capturing an idea" means saving a note, link, or thought to the client's Brain — a centralized intelligence repository used for content strategy
- Each client has a Brand Twin (brand profile), Strategy, and Brain in the system

YOUR ROLE:
- You are having a natural voice conversation with the user
- Your job is to understand what they need and gather ALL relevant details
- Do NOT execute any actions — just collect information through natural conversation
- Ask clarifying questions if details are missing (type of request, priority, specific details, which client)
- When you have enough information, summarize what you'll create and let them know it will be ready for their review after the call
- Be warm, conversational, and concise — this is a voice call, not a text chat
- Keep responses short (1-2 sentences) so the conversation flows naturally

ENDING THE CALL:
- When you have gathered all the information and confirmed the details, wrap up naturally
- Say something like "Great, I've got everything! I'll have that ready for your review. Talk soon!"
- Do NOT keep the conversation going unnecessarily after you have all the details`;

  const routeHint = getRouteContext(currentRoute || "");

  if (isSSRole) {
    return base + `\n\nThe user is an internal Stay Social team member. They may want to:
- Create content requests (social posts, email campaigns, designs, videos, etc.)
- Capture ideas or notes for a client's brain
- Discuss tasks or projects` +
      (clientName ? `\nThey are currently working with client: "${clientName}".` : `\nAsk which client they're working with.`) +
      routeHint;
  } else {
    return base + `\n\nThe user is a client. They may want to:
- Submit content requests (social posts, emails, designs, videos, or general requests)
- Share ideas or notes to save to their brain for future content` +
      (clientName ? `\nTheir business is "${clientName}".` : "") +
      routeHint;
  }
}

// Resolve a client name to a client ID
async function resolveClientByName(serviceClient: any, name: string): Promise<string | null> {
  const { data } = await serviceClient.from("clients").select("id, name").ilike("name", `%${name}%`).limit(5);
  if (!data || data.length === 0) return null;
  // Prefer exact match (case-insensitive)
  const exact = data.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  return exact ? exact.id : data[0].id;
}

// Resolve a user name to a user ID
async function resolveUserByName(serviceClient: any, name: string): Promise<string | null> {
  const { data } = await serviceClient.from("users").select("id, name").ilike("name", `%${name}%`).limit(5);
  if (!data || data.length === 0) return null;
  const exact = data.find((u: any) => u.name?.toLowerCase() === name.toLowerCase());
  return exact ? exact.id : data[0].id;
}

// Execute a single tool call and return the result
async function executeTool(
  fnName: string,
  args: any,
  serviceClient: any,
  userId: string,
  clientId: string | null,
  isSSRole: boolean
): Promise<any> {
  if (fnName === "create_request") {
    // Resolve client: use profile clientId, or look up by name for SS users
    let targetClientId = clientId;
    if (!targetClientId && args.client_name && isSSRole) {
      targetClientId = await resolveClientByName(serviceClient, args.client_name);
      if (!targetClientId) {
        return { error: `No client found matching "${args.client_name}". Please check the name.` };
      }
    }
    if (!targetClientId) {
      return { error: "No client selected. Please specify which client this request is for." };
    }
    if (!isSSRole && targetClientId !== clientId) {
      return { error: "You can only create requests for your own account." };
    }

    // Resolve assignee by name if provided
    let assigneeId: string | null = null;
    if (args.assigned_to_name && isSSRole) {
      assigneeId = await resolveUserByName(serviceClient, args.assigned_to_name);
    }

    const { data, error } = await serviceClient.from("requests").insert({
      topic: args.topic,
      type: args.type || "general",
      notes: args.notes || null,
      priority: args.priority || "normal",
      client_id: targetClientId,
      created_by_user_id: userId,
      assigned_to_user_id: assigneeId,
      source_type: "hub_assistant",
      raw_input_text: `${args.topic}${args.notes ? "\n" + args.notes : ""}`,
    }).select("id, topic, type").single();

    if (error) {
      console.error("create_request error:", error);
      return { error: "Failed to create request. Please try again." };
    }
    // Look up client name for the response
    let resolvedClientName = args.client_name || null;
    if (!resolvedClientName && targetClientId) {
      const { data: c } = await serviceClient.from("clients").select("name").eq("id", targetClientId).single();
      resolvedClientName = c?.name || null;
    }
    return { success: true, request_id: data.id, topic: data.topic, type: data.type, client_name: resolvedClientName, assigned_to: args.assigned_to_name || null };
  }

  if (fnName === "capture_idea") {
    let targetClientId = clientId;
    if (!targetClientId && args.client_name && isSSRole) {
      targetClientId = await resolveClientByName(serviceClient, args.client_name);
      if (!targetClientId) {
        return { error: `No client found matching "${args.client_name}". Please check the name.` };
      }
    }
    if (!targetClientId) {
      return { error: "No client selected. Please specify which client to save this for." };
    }
    if (!isSSRole && targetClientId !== clientId) {
      return { error: "You can only capture ideas for your own account." };
    }
    const { data, error } = await serviceClient.from("brain_captures").insert({
      content: args.content,
      type: args.type || "note",
      link_url: args.link_url || null,
      client_id: targetClientId,
      created_by_user_id: userId,
    }).select("id").single();

    if (error) {
      console.error("capture_idea error:", error);
      return { error: "Failed to save idea. Please try again." };
    }
    return { success: true, capture_id: data.id };
  }

  if (fnName === "query_tasks" && isSSRole) {
    let query = serviceClient.from("tasks").select("id, title, status, priority, due_at, client_id, assigned_to_user_id").order("created_at", { ascending: false }).limit(20);
    if (args.status) query = query.eq("status", args.status);
    if (args.search) query = query.ilike("title", `%${args.search}%`);

    let result: any = null;

    if (args.client_name) {
      const { data: clients } = await serviceClient.from("clients").select("id").ilike("name", `%${args.client_name}%`);
      const clientIds = (clients || []).map((c: any) => c.id);
      if (clientIds.length > 0) {
        query = query.in("client_id", clientIds);
      } else {
        result = { tasks: [], message: `No clients found matching "${args.client_name}"` };
      }
    }

    if (args.assignee_name && !result) {
      const { data: users } = await serviceClient.from("users").select("id").ilike("name", `%${args.assignee_name}%`);
      const userIds = (users || []).map((u: any) => u.id);
      if (userIds.length > 0) {
        query = query.in("assigned_to_user_id", userIds);
      } else {
        result = { tasks: [], message: `No users found matching "${args.assignee_name}"` };
      }
    }

    if (!result) {
      const { data, error } = await query;
      if (error) {
        console.error("query_tasks error:", error);
        return { error: "Failed to query tasks." };
      }
      const cIds = [...new Set((data || []).map((t: any) => t.client_id).filter(Boolean))];
      const aIds = [...new Set((data || []).map((t: any) => t.assigned_to_user_id).filter(Boolean))];
      const [clientsRes, usersRes] = await Promise.all([
        cIds.length > 0 ? serviceClient.from("clients").select("id, name").in("id", cIds) : { data: [] },
        aIds.length > 0 ? serviceClient.from("users").select("id, name").in("id", aIds) : { data: [] },
      ]);
      const clientMap: Record<string, string> = {};
      (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c.name; });
      const userMap: Record<string, string> = {};
      (usersRes.data || []).forEach((u: any) => { userMap[u.id] = u.name; });
      result = {
        tasks: (data || []).map((t: any) => ({
          id: t.id, title: t.title, status: t.status, priority: t.priority,
          due_at: t.due_at, client: clientMap[t.client_id] || null,
          assignee: userMap[t.assigned_to_user_id] || null,
        })),
        count: (data || []).length,
      };
    }
    return result;
  }

  if (fnName === "query_projects" && isSSRole) {
    let query = serviceClient.from("projects").select("id, name, status, description, client_id").order("created_at", { ascending: false }).limit(20);
    if (args.status) query = query.eq("status", args.status);
    if (args.search) query = query.ilike("name", `%${args.search}%`);

    let result: any = null;
    if (args.client_name) {
      const { data: clients } = await serviceClient.from("clients").select("id").ilike("name", `%${args.client_name}%`);
      const clientIds = (clients || []).map((c: any) => c.id);
      if (clientIds.length > 0) {
        query = query.in("client_id", clientIds);
      } else {
        result = { projects: [], message: `No clients found matching "${args.client_name}"` };
      }
    }

    if (!result) {
      const { data, error } = await query;
      if (error) {
        console.error("query_projects error:", error);
        return { error: "Failed to query projects." };
      }
      const cIds = [...new Set((data || []).map((p: any) => p.client_id).filter(Boolean))];
      const clientsRes = cIds.length > 0
        ? await serviceClient.from("clients").select("id, name").in("id", cIds)
        : { data: [] };
      const clientMap: Record<string, string> = {};
      (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c.name; });
      result = {
        projects: (data || []).map((p: any) => ({
          id: p.id, name: p.name, status: p.status,
          description: p.description, client: clientMap[p.client_id] || null,
        })),
        count: (data || []).length,
      };
    }
    return result;
  }

  return { error: `Unknown or unauthorized tool: ${fnName}` };
}

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Unauthorized" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    throw { status: 401, message: "Unauthorized" };
  }

  const userId = claimsData.claims.sub as string;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const [profileRes, rolesRes] = await Promise.all([
    serviceClient.from("users").select("client_id").eq("id", userId).single(),
    serviceClient.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const clientId = profileRes.data?.client_id;
  const roles = (rolesRes.data || []).map((r: any) => r.role);
  const isSSRole = roles.some((r: string) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r));

  let clientName: string | null = null;
  if (clientId) {
    const { data: client } = await serviceClient.from("clients").select("name").eq("id", clientId).single();
    clientName = client?.name || null;
  }

  return { userId, clientId, isSSRole, clientName, serviceClient };
}

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

    const auth = await authenticateUser(req).catch((e: any) => {
      throw e;
    });
    const { userId, clientId, isSSRole, clientName, serviceClient } = auth;

    const body = await req.json();

    // ─── Mode: get_voice_prompt ───
    // Returns the voice system prompt for ElevenLabs agent overrides
    if (body.mode === "get_voice_prompt") {
      const prompt = buildVoiceSystemPrompt(isSSRole, clientName, body.current_route);
      return new Response(JSON.stringify({ prompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Mode: extract_actions ───
    // Takes a voice transcript and extracts proposed actions WITHOUT executing them
    if (body.mode === "extract_actions") {
      const transcript = body.transcript;
      if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Transcript required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (transcript.length > 50000) {
        return new Response(JSON.stringify({ error: "Transcript too long" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tools = isSSRole ? [...baseTools, ...ssOnlyTools] : [...baseTools];

      const extractionPrompt = `You are an action extraction assistant. Analyze this voice conversation transcript and identify ALL actionable items the user wants to create.

For each action, call the appropriate tool. Only extract actions that the user clearly expressed intent to create. Do NOT extract queries or questions — only creation actions (create_request, capture_idea).

If the user changed their mind during the conversation (e.g., said "actually make that a video instead"), use the FINAL version of what they wanted.

If no actionable items are found, do not call any tools.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: extractionPrompt },
            { role: "user", content: `Here is the voice conversation transcript:\n\n${transcript}` },
          ],
          tools: tools.filter(t => ["create_request", "capture_idea"].includes(t.function.name)),
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
        throw new Error("AI request failed");
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];
      if (!choice) throw new Error("No AI response");

      const toolCalls = choice.message?.tool_calls || [];
      const actions = toolCalls.map((tc: any) => {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}
        const toolName = tc.function.name;
        let summary = "";
        if (toolName === "create_request") {
          summary = `Create ${args.type || "general"} request: "${args.topic || "Untitled"}"`;
        } else if (toolName === "capture_idea") {
          summary = `Capture ${args.type || "note"}: "${(args.content || "").slice(0, 80)}"`;
        }
        return { tool: toolName, args, summary };
      });

      return new Response(JSON.stringify({ actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Mode: execute_actions ───
    // Executes a list of pre-approved actions
    if (body.mode === "execute_actions") {
      const actions = body.actions;
      if (!Array.isArray(actions) || actions.length === 0) {
        return new Response(JSON.stringify({ error: "No actions to execute" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (actions.length > 10) {
        return new Response(JSON.stringify({ error: "Too many actions (max 10)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const action of actions) {
        const { tool, args } = action;
        if (!tool || !args) {
          results.push({ tool, success: false, error: "Invalid action" });
          continue;
        }
        // Only allow creation tools in execute mode
        if (!["create_request", "capture_idea"].includes(tool)) {
          results.push({ tool, success: false, error: "Tool not allowed in execute mode" });
          continue;
        }
        const result = await executeTool(tool, args, serviceClient, userId, clientId, isSSRole);
        results.push({ tool, ...result });
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Default mode: text chat ───
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalChars = messages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    if (totalChars > 50000) {
      return new Response(JSON.stringify({ error: "Conversation too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tools = isSSRole ? [...baseTools, ...ssOnlyTools] : [...baseTools];
    const currentRoute = body.current_route || "";
    const systemPrompt = buildSystemPrompt(isSSRole, clientName, currentRoute);

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

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        const content = assistantMsg.content || "";
        return new Response(JSON.stringify({ response: content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

        const toolResult = await executeTool(fnName, args, serviceClient, userId, clientId, isSSRole);

        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      round++;
    }

    return new Response(JSON.stringify({ response: "I completed the actions. Is there anything else you need?" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err?.status) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("hub-assistant error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
