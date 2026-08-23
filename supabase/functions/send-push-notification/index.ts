/**
 * send-push-notification — Web Push via VAPID
 *
 * Called by DB triggers or other edge functions when a qualifying event occurs.
 * Accepts a user_id (or "corey" shorthand) + payload, looks up push_subscriptions,
 * sends Web Push to each endpoint.
 *
 * Payload shape:
 *   { user_id?: string, title: string, body: string, url?: string }
 *
 * Uses the Web Push Protocol (RFC 8030) with VAPID auth (RFC 8292).
 * Dependencies: web-push via esm.sh
 */

// @deno-types="https://esm.sh/web-push@3.6.7/src/index.d.ts"
import webpush from "https://esm.sh/web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:corey@staysocial.ca";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return json({ error: "VAPID keys not configured" }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Accept service role key or CRON_SECRET
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (token !== serviceRoleKey && !(cronSecret && token === cronSecret)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    const body = await req.json();
    const { user_id, title, body: notifBody, url } = body as {
      user_id?: string;
      title: string;
      body: string;
      url?: string;
    };

    if (!title) return json({ error: "title required" }, 400);

    // Look up subscriptions — if user_id provided, scope to that user
    const query = supabase.from("push_subscriptions").select("*");
    if (user_id) query.eq("user_id", user_id);

    const { data: subs, error: subErr } = await query;
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) {
      return json({ ok: true, skipped: true, reason: "No push subscriptions" });
    }

    const payload = JSON.stringify({
      title,
      body: notifBody,
      url: url || "https://hub.staysocial.ca",
      icon: "https://hub.staysocial.ca/icon-192.png",
      badge: "https://hub.staysocial.ca/badge-72.png",
    });

    const results = await Promise.allSettled(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          return { endpoint: sub.endpoint, ok: true };
        } catch (err: any) {
          // 410 Gone = subscription expired, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
          return { endpoint: sub.endpoint, ok: false, error: String(err) };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).ok
    ).length;

    return json({ ok: true, sent, total: subs.length });
  } catch (err) {
    console.error("send-push-notification error:", err);
    return json({ error: String(err) }, 500);
  }
});
