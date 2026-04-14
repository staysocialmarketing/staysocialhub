import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Allow ss_admin or ss_team roles
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    if (!roles.some((r: string) => r === "ss_admin" || r === "ss_team")) {
      return new Response(JSON.stringify({ error: "Restricted" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { note_id, dry_run = false, confirmed_items } = body;

    if (!note_id) {
      return new Response(JSON.stringify({ error: "note_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: note, error: noteError } = await supabase
      .from("meeting_notes")
      .select("*")
      .eq("id", note_id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Note not found" }), { status: 404, headers: corsHeaders });
    }

    // ── SAVE PATH: confirmed_items provided, skip re-extraction ──────────────
    if (!dry_run && confirmed_items) {
      return await saveConfirmedItems({ supabase, note, confirmed_items, userId: userData.user.id });
    }

    // ── EXTRACT PATH: run AI extraction ──────────────────────────────────────
    if (!dry_run) {
      await supabase.from("meeting_notes").update({ extraction_status: "processing", updated_at: new Date().toISOString() }).eq("id", note_id);
    }

    // Fetch clients and existing projects for matching
    const { data: clients } = await supabase.from("clients").select("id, name");
    const clientList = (clients || []).map((c: any) => `${c.name} (${c.id})`).join(", ");

    const { data: projects } = await supabase.from("projects").select("id, name, client_id");
    const projectList = (projects || []).map((p: any) => `${p.name} (${p.id}, client: ${p.client_id || "none"})`).join(", ");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are an AI assistant that extracts structured data from meeting notes for a social media agency called Stay Social.

Available clients: ${clientList}
Existing projects: ${projectList}

Extract the following from the meeting notes:

1. **client_id**: Match the client discussed to one of the available clients. Return the UUID. If multiple clients are discussed, pick the primary one.

2. **action_items**: Array of the most urgent/important tasks mentioned. MAXIMUM 5 items — pick only the clearest, most actionable ones. Each must have:
   - title: Clear, actionable task name (e.g. "Create Instagram carousel for spring campaign")
   - description: Detailed description of what needs to be done
   - priority: high / medium / low
   - suggested_owner: "corey" if this is a strategy, leadership, or client-relationship decision; otherwise "team"
   - project_name: Name of the project this task belongs to (if applicable)

3. **projects**: Array of clearly named initiatives mentioned. MAXIMUM 2 items — only include concrete named projects (e.g. "Q2 Spring Campaign", "Website Redesign"), not vague themes or topics. Each should have:
   - name: Project name
   - description: Brief description of the project scope
   - existing_project_id: Match to an existing project ID if possible, otherwise null

4. **content_ideas**: Array of content ideas mentioned. Each should have:
   - title: Descriptive name for the content piece
   - description: Details about the content idea
   - content_type: social_post/email/video/reel/carousel/story/blog

5. **strategy_updates**: Object with any strategy-relevant info: goals, focus_areas, campaigns, pillars

6. **summary**: 2-3 sentence summary of the meeting, including key decisions made

Return ONLY valid JSON with these exact keys. If a section has no data, return empty array/object.`,
        messages: [
          {
            role: "user",
            content: `Meeting Title: ${note.title}\nMeeting Date: ${note.meeting_date || "Unknown"}\n\n--- MEETING NOTES ---\n${note.raw_content}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI extraction failed:", errText);
      if (!dry_run) {
        await supabase.from("meeting_notes").update({ extraction_status: "failed", updated_at: new Date().toISOString() }).eq("id", note_id);
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text || "";

    let extracted: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      extracted = JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      if (!dry_run) {
        await supabase.from("meeting_notes").update({ extraction_status: "failed", extracted_data: { raw_response: content }, updated_at: new Date().toISOString() }).eq("id", note_id);
      }
      return new Response(JSON.stringify({ error: "Failed to parse extraction" }), { status: 500, headers: corsHeaders });
    }

    // dry_run: return extracted data for review without saving anything
    if (dry_run) {
      return new Response(
        JSON.stringify({ success: true, extracted }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Non-dry-run without confirmed_items: legacy auto-save path (unused by new UI but kept for safety)
    return await saveConfirmedItems({
      supabase,
      note,
      confirmed_items: {
        action_items: extracted.action_items || [],
        projects: extracted.projects || [],
        content_ideas: extracted.content_ideas || [],
        strategy_updates: extracted.strategy_updates || {},
        client_id: extracted.client_id,
        summary: extracted.summary,
      },
      userId: userData.user.id,
      fullExtracted: extracted,
    });

  } catch (error) {
    console.error("Extract error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function saveConfirmedItems({ supabase, note, confirmed_items, userId, fullExtracted }: {
  supabase: any;
  note: any;
  confirmed_items: any;
  userId: string;
  fullExtracted?: any;
}) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const results: any = { tasks_created: 0, captures_created: 0, projects_created: 0, strategy_updated: false };
  const { action_items = [], projects = [], content_ideas = [], strategy_updates = {}, client_id } = confirmed_items;

  // Create projects first so tasks can be linked
  const projectIdMap: Record<string, string> = {};
  for (const proj of projects) {
    if (proj.existing_project_id) {
      projectIdMap[proj.name] = proj.existing_project_id;
      continue;
    }
    const { data: newProject, error } = await supabase.from("projects").insert({
      name: proj.name,
      description: proj.description || null,
      client_id: client_id || null,
      created_by_user_id: userId,
      status: "active",
    }).select("id").single();
    if (!error && newProject) {
      projectIdMap[proj.name] = newProject.id;
      results.projects_created++;
    }
  }

  // Create tasks
  for (const item of action_items) {
    const projectId = item.project_name ? projectIdMap[item.project_name] || null : null;
    const { error } = await supabase.from("tasks").insert({
      title: item.title,
      description: item.description || null,
      priority: item.priority || "normal",
      status: "todo",
      client_id: client_id || null,
      project_id: projectId,
      created_by_user_id: userId,
      source_type: "meeting_notes",
    });
    if (!error) results.tasks_created++;
  }

  // Create brain captures from content ideas
  if (client_id) {
    for (const idea of content_ideas) {
      const { error } = await supabase.from("brain_captures").insert({
        client_id,
        created_by_user_id: userId,
        type: "note",
        content: `[${idea.content_type || "idea"}] ${idea.title}: ${idea.description || ""}`,
        tags: JSON.stringify(["meeting-notes", idea.content_type || "idea"]),
      });
      if (!error) results.captures_created++;
    }
  }

  // Update strategy if applicable
  if (strategy_updates && client_id && Object.keys(strategy_updates).length > 0) {
    const { data: existingStrategy } = await supabase
      .from("client_strategy")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    if (existingStrategy) {
      const updates: any = { updated_at: new Date().toISOString() };
      if (strategy_updates.goals) {
        const existing = existingStrategy.goals_json as any || {};
        updates.goals_json = { ...existing, meeting_notes_goals: strategy_updates.goals };
      }
      if (strategy_updates.focus_areas) {
        const existing = existingStrategy.focus_json as any || {};
        updates.focus_json = { ...existing, meeting_notes_focus: strategy_updates.focus_areas };
      }
      await supabase.from("client_strategy").update(updates).eq("client_id", client_id);
      results.strategy_updated = true;
    }
  }

  const extractedToStore = fullExtracted || confirmed_items;

  await supabase.from("meeting_notes").update({
    extraction_status: "done",
    extracted_data: { ...extractedToStore, routing_results: results },
    client_id: client_id || null,
    updated_at: new Date().toISOString(),
  }).eq("id", note.id);

  await supabase.from("notifications").insert({
    user_id: userId,
    title: "Meeting notes extracted",
    body: `${results.tasks_created} tasks, ${results.captures_created} captures, ${results.projects_created} projects from "${note.title}"`,
    link: "/admin/meeting-notes",
  });

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
