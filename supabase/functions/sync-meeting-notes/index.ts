import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshTokenIfNeeded(
  integration: any,
  supabase: any,
  clientId: string,
  clientSecret: string
) {
  const expiresAt = new Date(integration.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) return integration.access_token;

  if (!integration.refresh_token) throw new Error("No refresh token available");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("Token refresh failed: " + JSON.stringify(data));

  const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await supabase
    .from("google_integrations")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", integration.user_id);

  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Parse request body for since_days
    let sinceDays = 30;
    try {
      const body = await req.json();
      if (body.since_days && typeof body.since_days === "number") {
        sinceDays = body.since_days;
      }
    } catch { /* no body or invalid JSON, use default */ }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userSupabase.auth.getUser();
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (claimsData.user.email !== "corey@staysocial.ca") {
      return new Response(JSON.stringify({ error: "Restricted" }), { status: 403, headers: corsHeaders });
    }

    const { data: integration, error: intError } = await supabase
      .from("google_integrations")
      .select("*")
      .eq("user_id", claimsData.user.id)
      .single();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: "Google not connected" }), { status: 400, headers: corsHeaders });
    }

    const accessToken = await refreshTokenIfNeeded(integration, supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

    // Build date filter
    const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const searchQuery = encodeURIComponent(
      `mimeType='application/vnd.google-apps.document' and (name contains 'Meeting notes' or name contains 'meeting notes') and modifiedTime > '${sinceDate}'`
    );

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,createdTime,modifiedTime)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const driveData = await driveRes.json();
    if (!driveRes.ok) {
      console.error("Drive API error:", driveData);
      return new Response(JSON.stringify({ error: "Drive API failed", details: driveData }), { status: 500, headers: corsHeaders });
    }

    const files = driveData.files || [];
    let synced = 0;
    let skipped = 0;

    for (const file of files) {
      const { data: existing } = await supabase
        .from("meeting_notes")
        .select("id")
        .eq("google_doc_id", file.id)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const docRes = await fetch(
        `https://docs.googleapis.com/v1/documents/${file.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!docRes.ok) {
        console.error(`Failed to fetch doc ${file.id}:`, await docRes.text());
        continue;
      }

      const doc = await docRes.json();

      let rawContent = "";
      if (doc.body?.content) {
        for (const element of doc.body.content) {
          if (element.paragraph?.elements) {
            for (const el of element.paragraph.elements) {
              if (el.textRun?.content) rawContent += el.textRun.content;
            }
          }
        }
      }

      let meetingDate = null;
      const dateMatch = file.name.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
      if (dateMatch) {
        meetingDate = dateMatch[1];
      } else if (file.createdTime) {
        meetingDate = file.createdTime.split("T")[0];
      }

      const { error: insertError } = await supabase.from("meeting_notes").insert({
        user_id: claimsData.user.id,
        google_doc_id: file.id,
        title: file.name || "Untitled",
        raw_content: rawContent,
        meeting_date: meetingDate,
        extraction_status: "pending",
      });

      if (insertError) {
        console.error(`Failed to insert note ${file.id}:`, insertError);
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped, total: files.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
