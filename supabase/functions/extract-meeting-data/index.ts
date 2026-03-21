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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Get the meeting note
    const { data: note, error: noteError } = await supabase
      .from("meeting_notes")
      .select("*")
      .eq("id", note_id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Note not found" }), { status: 404, headers: corsHeaders });
    }

    // Update status to processing
    await supabase.from("meeting_notes").update({ extraction_status: "processing", updated_at: new Date().toISOString() }).eq("id", note_id);

    // Fetch all clients for name matching
    const { data: clients } = await supabase.from("clients").select("id, name");
    const clientList = (clients || []).map((c: any) => `${c.name} (${c.id})`).join(", ");

    // AI extraction
    const aiRes = await fetch("https://ai.lovable.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that extracts structured data from meeting notes for a social media agency called Stay Social.

Available clients: ${clientList}

Extract the following from the meeting notes:
1. **client_id**: Match the client discussed to one of the available clients. Return the UUID. If multiple clients, pick the primary one.
2. **action_items**: Array of tasks/action items mentioned. Each should have: title, description, priority (low/normal/high/urgent), assignee_name (if mentioned)
3. **content_ideas**: Array of content ideas mentioned. Each should have: title, description, content_type (social_post/email/video/reel/carousel)
4. **strategy_updates**: Object with any strategy-relevant info: goals, focus_areas, campaigns, pillars
5. **summary**: 2-3 sentence summary of the meeting

Return ONLY valid JSON with these exact keys. If a section has no data, return empty array/object.`,
          },
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
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let extracted: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      extracted = JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      await supabase.from("meeting_notes").update({ extraction_status: "failed", extracted_data: { raw_response: content }, updated_at: new Date().toISOString() }).eq("id", note_id);
      return new Response(JSON.stringify({ error: "Failed to parse extraction" }), { status: 500, headers: corsHeaders });
    }

    // Route extracted data
    const results: any = { tasks_created: 0, captures_created: 0, strategy_updated: false };

    // Create tasks from action items
    if (extracted.action_items?.length) {
      for (const item of extracted.action_items) {
        const { error } = await supabase.from("tasks").insert({
          title: item.title,
          description: item.description || null,
          priority: item.priority || "normal",
          status: "todo",
          client_id: extracted.client_id || null,
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
      body: `${results.tasks_created} tasks, ${results.captures_created} captures created from "${note.title}"`,
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
