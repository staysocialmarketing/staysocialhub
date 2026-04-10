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
    if (userError || !userData.user || userData.user.email !== "corey@staysocial.ca") {
      return new Response(JSON.stringify({ error: "Restricted" }), { status: 403, headers: corsHeaders });
    }

    const { note_id } = await req.json();
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

    await supabase.from("meeting_notes").update({ extraction_status: "processing", updated_at: new Date().toISOString() }).eq("id", note_id);

    // Fetch clients and existing projects for matching
    const { data: clients } = await supabase.from("clients").select("id, name");
    const clientList = (clients || []).map((c: any) => `${c.name} (${c.id})`).join(", ");

    const { data: projects } = await supabase.from("projects").select("id, name, client_id");
    const projectList = (projects || []).map((p: any) => `${p.name} (${p.id}, client: ${p.client_id || "none"})`).join(", ");

    // AI extraction with enhanced prompt
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

2. **action_items**: Array of tasks/action items mentioned. Each must have:
   - title: Clear, actionable task name (e.g. "Create Instagram carousel for spring campaign")
   - description: Detailed description of what needs to be done, including any specifics mentioned
   - priority: low/normal/high/urgent
   - assignee_name: Name of the person responsible (if mentioned)
   - project_name: Name of the project this task belongs to (if applicable)

3. **projects**: Array of projects mentioned or implied. Each should have:
   - name: Project name (e.g. "Q2 Spring Campaign", "Website Redesign")
   - description: Brief description of the project scope
   - Match to an existing project ID if possible, otherwise set existing_project_id to null

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
      await supabase.from("meeting_notes").update({ extraction_status: "failed", updated_at: new Date().toISOString() }).eq("id", note_id);
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
      await supabase.from("meeting_notes").update({ extraction_status: "failed", extracted_data: { raw_response: content }, updated_at: new Date().toISOString() }).eq("id", note_id);
      return new Response(JSON.stringify({ error: "Failed to parse extraction" }), { status: 500, headers: corsHeaders });
    }

    const results: any = { tasks_created: 0, captures_created: 0, projects_created: 0, strategy_updated: false };

    // Create projects first so we can link tasks
    const projectIdMap: Record<string, string> = {};
    if (extracted.projects?.length) {
      for (const proj of extracted.projects) {
        if (proj.existing_project_id) {
          projectIdMap[proj.name] = proj.existing_project_id;
          continue;
        }
        const { data: newProject, error } = await supabase.from("projects").insert({
          name: proj.name,
          description: proj.description || null,
          client_id: extracted.client_id || null,
          created_by_user_id: userData.user.id,
          status: "active",
        }).select("id").single();
        if (!error && newProject) {
          projectIdMap[proj.name] = newProject.id;
          results.projects_created++;
        }
      }
    }

    // Create tasks from action items
    if (extracted.action_items?.length) {
      for (const item of extracted.action_items) {
        const projectId = item.project_name ? projectIdMap[item.project_name] || null : null;
        const { error } = await supabase.from("tasks").insert({
          title: item.title,
          description: item.description || null,
          priority: item.priority || "normal",
          status: "todo",
          client_id: extracted.client_id || null,
          project_id: projectId,
          created_by_user_id: userData.user.id,
          source_type: "meeting_notes",
        });
        if (!error) results.tasks_created++;
      }
    }

    // Create brain captures from content ideas
    if (extracted.content_ideas?.length && extracted.client_id) {
      for (const idea of extracted.content_ideas) {
        const { error } = await supabase.from("brain_captures").insert({
          client_id: extracted.client_id,
          created_by_user_id: userData.user.id,
          type: "note",
          content: `[${idea.content_type || "idea"}] ${idea.title}: ${idea.description || ""}`,
          tags: JSON.stringify(["meeting-notes", idea.content_type || "idea"]),
        });
        if (!error) results.captures_created++;
      }
    }

    // Update strategy if applicable
    if (extracted.strategy_updates && extracted.client_id && Object.keys(extracted.strategy_updates).length > 0) {
      const { data: existingStrategy } = await supabase
        .from("client_strategy")
        .select("*")
        .eq("client_id", extracted.client_id)
        .maybeSingle();

      if (existingStrategy) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (extracted.strategy_updates.goals) {
          const existing = existingStrategy.goals_json as any || {};
          updates.goals_json = { ...existing, meeting_notes_goals: extracted.strategy_updates.goals };
        }
        if (extracted.strategy_updates.focus_areas) {
          const existing = existingStrategy.focus_json as any || {};
          updates.focus_json = { ...existing, meeting_notes_focus: extracted.strategy_updates.focus_areas };
        }
        await supabase.from("client_strategy").update(updates).eq("client_id", extracted.client_id);
        results.strategy_updated = true;
      }
    }

    // Update note with extracted data and link client
    await supabase.from("meeting_notes").update({
      extraction_status: "done",
      extracted_data: { ...extracted, routing_results: results },
      client_id: extracted.client_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", note_id);

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userData.user.id,
      title: "Meeting notes extracted",
      body: `${results.tasks_created} tasks, ${results.captures_created} captures, ${results.projects_created} projects from "${note.title}"`,
      link: "/admin/meeting-notes",
    });

    return new Response(
      JSON.stringify({ success: true, extracted, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
