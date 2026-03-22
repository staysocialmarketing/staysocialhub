import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // contains user access token

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response("Google OAuth not configured", { status: 500 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${SUPABASE_URL}/functions/v1/google-oauth-callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("Token exchange failed:", tokenData);
    return new Response("Token exchange failed: " + JSON.stringify(tokenData), { status: 400 });
  }

  // Parse state JSON to extract token and origin
  let userToken = state;
  let redirectOrigin = "https://hub.staysocial.ca";
  try {
    const parsed = JSON.parse(state);
    userToken = parsed.token || state;
    redirectOrigin = parsed.origin || redirectOrigin;
  } catch {
    // Legacy: state is just the token string
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
  if (userError || !userData.user) {
    return new Response("Invalid user session", { status: 401 });
  }

  // Restrict to corey@staysocial.ca
  if (userData.user.email !== "corey@staysocial.ca") {
    return new Response("Unauthorized: this feature is restricted", { status: 403 });
  }

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  // Upsert google integration
  const { error: upsertError } = await supabase
    .from("google_integrations")
    .upsert({
      user_id: userData.user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || "",
      token_expires_at: expiresAt,
      scopes: "drive.readonly,documents.readonly",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("Upsert error:", upsertError);
    return new Response("Failed to save tokens", { status: 500 });
  }

  // Redirect back to meeting notes page
  const origin = url.searchParams.get("origin") || "https://staysocialhub.lovable.app";
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/admin/meeting-notes?connected=true` },
  });
});
