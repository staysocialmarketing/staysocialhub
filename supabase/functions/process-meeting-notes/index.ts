import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

// ---------------------------------------------------------------------------
// Real-meeting filter
// ---------------------------------------------------------------------------

/**
 * Returns true if the transcript has meaningful spoken content.
 * Rules (either passes):
 *   - Word count > 100 after stripping system lines
 *   - At least 2 distinct speaker turns detected
 *
 * System lines: blank lines, single-word lines like "Google Meet", "Transcript",
 * timestamps (HH:MM:SS), and lines with no alpha chars.
 */
function isRealMeeting(transcript: string): { real: boolean; reason: string } {
  const lines = transcript.split("\n");

  // Strip obvious system/metadata lines
  const contentLines = lines.filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (!/[a-zA-Z]/.test(t)) return false; // no letters at all (timestamps, etc.)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return false; // pure timestamp
    if (/^(google meet|transcript|recording|auto-generated|caption)/i.test(t)) return false;
    return true;
  });

  const words = contentLines.join(" ").split(/\s+/).filter(Boolean);
  if (words.length > 100) {
    return { real: true, reason: `word_count:${words.length}` };
  }

  // Check for multiple speaker turns — look for "Name: ..." or "Name (HH:MM):" patterns
  const speakerPattern = /^[A-Z][a-zA-Z\s]{1,30}[:(]/;
  const speakers = new Set<string>();
  for (const line of contentLines) {
    const m = line.match(/^([A-Z][a-zA-Z\s]{1,30})[:(]/);
    if (m) speakers.add(m[1].trim());
  }
  if (speakers.size >= 2) {
    return { real: true, reason: `speaker_turns:${speakers.size}` };
  }

  return {
    real: false,
    reason: `word_count:${words.length},speaker_turns:${speakers.size}`,
  };
}

// ---------------------------------------------------------------------------
// Agent routing logic
// ---------------------------------------------------------------------------

function routeToAgent(
  title: string,
  summary: string,
  decisions: unknown[],
  actionItems: unknown[]
): string {
  const text = `${title} ${summary}`.toLowerCase();

  // Strategy / leadership / client relationship → Lev
  if (
    /\b(strateg|roadmap|budget|hire|partner|investor|leadership|vision|corey)\b/.test(text)
  ) {
    return "Lev";
  }

  // Tech / dev / infrastructure → Forge
  if (
    /\b(bug|deploy|infrastructure|database|api|code|dev|engineer|supabase|github|edge function|migration)\b/.test(
      text
    )
  ) {
    return "Forge";
  }

  // Client content / social / creative → Quill
  if (
    /\b(client|content|post|caption|campaign|instagram|facebook|linkedin|creative|copy|brand)\b/.test(
      text
    )
  ) {
    return "Quill";
  }

  // Default: Lev handles anything ambiguous
  return "Lev";
}

// ---------------------------------------------------------------------------
// Anthropic extraction
// ---------------------------------------------------------------------------

interface ExtractedNotes {
  title: string;
  participants: string[];
  summary: string;
  decisions: { decision: string; context?: string }[];
  action_items: {
    task: string;
    owner?: string;
    due_date?: string;
    priority?: string;
  }[];
  routed_to: string;
}

async function extractWithClaude(
  transcript: string,
  filename: string,
  recordedAt: string,
  anthropicKey: string
): Promise<ExtractedNotes> {
  const prompt = `You are an AI assistant that extracts structured information from meeting transcripts for Stay Social, a marketing agency.

Extract the following from the transcript and return ONLY valid JSON (no markdown, no code fences):

{
  "title": "Short descriptive title for this meeting (max 10 words)",
  "participants": ["Name1", "Name2"],
  "summary": "2-3 sentence summary covering what was discussed and key outcomes",
  "decisions": [
    { "decision": "What was decided", "context": "Brief context (optional)" }
  ],
  "action_items": [
    {
      "task": "Clear, actionable task description",
      "owner": "Person responsible (if mentioned, otherwise null)",
      "due_date": "YYYY-MM-DD (if mentioned, otherwise null)",
      "priority": "high | medium | low"
    }
  ]
}

Rules:
- participants: only real human names you see in the transcript — not "Google Meet" or system names
- decisions: only firm decisions, not discussion points
- action_items: concrete next steps with a clear owner or implied owner
- If a field has no data, use empty array [] or null
- Return valid JSON only

Filename: ${filename}
Recorded at: ${recordedAt}

--- TRANSCRIPT ---
${transcript.slice(0, 12000)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";

  let extracted: Omit<ExtractedNotes, "routed_to">;
  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    extracted = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`);
  }

  const routed_to = routeToAgent(
    extracted.title,
    extracted.summary,
    extracted.decisions,
    extracted.action_items
  );

  return { ...extracted, routed_to };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth: accept either user JWT or internal API key ────────────────────
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const AGENT_BRIDGE_API_KEY = Deno.env.get("AGENT_BRIDGE_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return reply({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    // Allow requests from the agent bridge (internal) or an authenticated user
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");

    let authed = false;

    if (apiKey && AGENT_BRIDGE_API_KEY && apiKey === AGENT_BRIDGE_API_KEY) {
      authed = true; // trusted internal call
    } else if (authHeader?.startsWith("Bearer ")) {
      // Verify JWT
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(SUPABASE_URL, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await userClient.auth.getUser();
      if (!error && user) {
        // Check for SS team role
        const db = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: roles } = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
        if (roles && roles.length > 0) authed = true;
      }
    }

    if (!authed) {
      return reply({ error: "Unauthorized" }, 401);
    }

    // ── Parse request ────────────────────────────────────────────────────────
    let body: { transcript?: string; filename?: string; recorded_at?: string };
    try {
      body = await req.json();
    } catch {
      return reply({ error: "Invalid JSON body" }, 400);
    }

    const { transcript, filename = "unknown.mp4", recorded_at } = body;

    if (!transcript || typeof transcript !== "string") {
      return reply({ error: "transcript (string) is required" }, 400);
    }

    const recordedAt = recorded_at ?? new Date().toISOString();

    // ── Step 1: Filter — is this a real meeting? ─────────────────────────────
    const { real, reason } = isRealMeeting(transcript);
    if (!real) {
      console.log(`[process-meeting-notes] Junk meeting detected: ${filename} (${reason})`);
      return reply({ processed: false, reason: "junk", detail: reason });
    }

    console.log(`[process-meeting-notes] Real meeting: ${filename} (${reason})`);

    // ── Step 2: Extract structured notes via Claude ──────────────────────────
    const extracted = await extractWithClaude(
      transcript,
      filename,
      recordedAt,
      ANTHROPIC_API_KEY
    );

    // ── Step 3: Store in meeting_notes table ─────────────────────────────────
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: note, error: insertError } = await db
      .from("meeting_notes")
      .insert({
        title: extracted.title,
        participants: extracted.participants,
        recorded_at: recordedAt,
        summary: extracted.summary,
        decisions: extracted.decisions,
        action_items: extracted.action_items,
        raw_transcript: transcript,
        routed_to: extracted.routed_to,
        source_filename: filename,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[process-meeting-notes] DB insert error:", insertError);
      // Return extracted data even if DB write fails, so the caller has the data
      return reply(
        {
          processed: true,
          stored: false,
          db_error: insertError.message,
          data: extracted,
        },
        207
      );
    }

    console.log(`[process-meeting-notes] Stored note ${note.id}, routed to ${extracted.routed_to}`);

    return reply({
      processed: true,
      stored: true,
      note_id: note.id,
      data: extracted,
    });
  } catch (e) {
    console.error("[process-meeting-notes] Unhandled error:", e);
    return reply(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});
