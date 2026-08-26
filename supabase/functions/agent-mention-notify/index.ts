/**
 * agent-mention-notify
 *
 * Called by the comment notification trigger when an agent (ss_agent role)
 * is mentioned in a post comment. Sends a Telegram message to the agent's
 * bot so NanoClaw can wake the right agent container and action the request.
 *
 * Expected body:
 * {
 *   agent_id: string,          // UUID of the tagged agent
 *   agent_name: string,        // "Forge" | "Quill" | "Scout" | "Lev"
 *   tagger_name: string,       // Who tagged them
 *   comment_body: string,
 *   post_id: string,
 *   post_title: string,
 *   is_internal: boolean,
 * }
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   FORGE_TG_BOT_TOKEN   — Forge's Telegram bot token
 *   QUILL_TG_BOT_TOKEN   — Quill's Telegram bot token
 *   SCOUT_TG_BOT_TOKEN   — Scout's Telegram bot token
 *   LEV_TG_BOT_TOKEN     — Lev's Telegram bot token
 *   AGENT_TG_CHAT_ID     — Corey's Telegram user ID (all agents DM Corey)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUB_URL = "https://hub.staysocial.ca";

// Map agent name → env var holding their bot token
const AGENT_BOT_TOKEN_KEYS: Record<string, string> = {
  forge: "FORGE_TG_BOT_TOKEN",
  quill: "QUILL_TG_BOT_TOKEN",
  scout: "SCOUT_TG_BOT_TOKEN",
  lev:   "LEV_TG_BOT_TOKEN",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      agent_name,
      tagger_name,
      comment_body,
      post_id,
      post_title,
      is_internal,
    } = await req.json();

    const key = (agent_name || "").toLowerCase();
    const tokenEnvKey = AGENT_BOT_TOKEN_KEYS[key];

    if (!tokenEnvKey) {
      return new Response(JSON.stringify({ skipped: true, reason: "unknown agent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = Deno.env.get(tokenEnvKey);
    const chatId   = Deno.env.get("AGENT_TG_CHAT_ID"); // Corey's TG user ID

    if (!botToken || !chatId) {
      console.warn(`Missing secrets for ${agent_name}: token=${!!botToken} chatId=${!!chatId}`);
      return new Response(JSON.stringify({ skipped: true, reason: "missing secrets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postUrl = `${HUB_URL}/pipeline/${post_id}`;
    const noteLabel = is_internal ? "🔒 Internal note" : "💬 Comment";

    const text = [
      `🔔 *${tagger_name} tagged you in HUB*`,
      ``,
      `*Post:* ${post_title}`,
      `*${noteLabel}:* ${comment_body}`,
      ``,
      `→ ${postUrl}`,
    ].join("\n");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    const tgData = await tgRes.json();

    return new Response(JSON.stringify({ ok: tgData.ok, agent: agent_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("agent-mention-notify error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
