/**
 * daily-digest — Corey's morning action summary
 *
 * Triggered by Vercel cron at 12:00 UTC (8:00 AM ADT) daily.
 * Queries corey_action_queue view, formats HTML email, sends via Resend.
 * Only fires when items are waiting — no empty emails.
 *
 * Auth: expects Authorization: Bearer <CRON_SECRET> header from Vercel.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://hub.staysocial.ca";

interface ActionItem {
  item_type: string;
  priority: string;
  ref_id: string;
  summary: string;
  link: string;
  item_created_at: string;
  client_name: string | null;
}

function priorityLabel(p: string): string {
  if (p === "high") return "HIGH";
  if (p === "low") return "LOW";
  return "MED";
}

function priorityColor(p: string): string {
  if (p === "high") return "#ef4444";
  if (p === "low") return "#6b7280";
  return "#f59e0b";
}

function itemTypeLabel(t: string): string {
  switch (t) {
    case "post_review": return "Post needs review";
    case "decision": return "Decision needed";
    case "overdue_task": return "Overdue task";
    default: return t;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildDigestHtml(items: ActionItem[], dateStr: string): string {
  const count = items.length;
  const subject = `[Stay Social] ${count} item${count !== 1 ? "s" : ""} waiting on you — ${dateStr}`;

  const rows = items
    .map((item, i) => {
      const pLabel = priorityLabel(item.priority);
      const pColor = priorityColor(item.priority);
      const typeLabel = itemTypeLabel(item.item_type);
      const url = item.link.startsWith("http") ? item.link : `${APP_URL}${item.link}`;
      const safeSummary = escapeHtml(item.summary || "Untitled");
      const safeClient = item.client_name ? ` — ${escapeHtml(item.client_name)}` : "";

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:52px;vertical-align:top;padding-right:12px;">
                  <div style="background:${pColor};color:#fff;font-size:10px;font-weight:700;padding:3px 6px;border-radius:4px;text-align:center;letter-spacing:0.5px;">${pLabel}</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 2px;color:#6b7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">${i + 1}. ${escapeHtml(typeLabel)}${safeClient}</p>
                  <p style="margin:0 0 8px;color:#111827;font-size:15px;font-weight:600;line-height:1.4;">${safeSummary}</p>
                  <a href="${url}" style="color:#ff6b35;font-size:13px;font-weight:500;text-decoration:none;">
                    View &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;border-radius:16px 16px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#ff6b35;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Stay Social</p>
                    <p style="margin:2px 0 0;color:#6b7280;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:2px;">Daily Digest</p>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    <p style="margin:0;color:#9ca3af;font-size:13px;">${escapeHtml(dateStr)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#111827;font-size:18px;font-weight:600;">Good morning, Corey.</p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
                You have <strong style="color:#111827;">${count} item${count !== 1 ? "s" : ""}</strong> waiting on you.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <div style="text-align:center;">
                <a href="${APP_URL}"
                   style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                  Open the HUB &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border:1px solid #e5e7eb;border-top:0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                &mdash; Lev, Stay Social Chief of Staff<br />
                <a href="${APP_URL}/settings" style="color:#9ca3af;text-decoration:underline;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Vercel cron sends GET; direct calls may be POST. Both are fine.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
    });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    // Auth: accept either CRON_SECRET (from Vercel cron via Authorization header)
    // or service role key (for manual/test invocations).
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceRoleKey;
    const isCron = cronSecret && token === cronSecret;

    if (!isServiceRole && !isCron) {
      return json({ error: "Unauthorized" }, 401);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "lev@staysocial.ca";
    const coreyEmail = Deno.env.get("COREY_EMAIL") || "corey@staysocial.ca";

    if (!resendApiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Query the action queue view
    const { data: items, error: qErr } = await supabase
      .from("corey_action_queue")
      .select("*")
      .order("priority", { ascending: false }) // high first
      .order("item_created_at", { ascending: true });

    if (qErr) {
      console.error("corey_action_queue query error:", qErr);
      return json({ error: qErr.message }, 500);
    }

    if (!items || items.length === 0) {
      console.log("daily-digest: nothing to report, skipping send");
      return json({ ok: true, skipped: true, reason: "No items in queue" });
    }

    // Sort: high → medium → low
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...items].sort(
      (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
    );

    // Format date for display (e.g. "Aug 24, 2026")
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Halifax",
    });

    const count = sorted.length;
    const subject = `[Stay Social] ${count} item${count !== 1 ? "s" : ""} waiting on you — ${dateStr}`;
    const html = buildDigestHtml(sorted, dateStr);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Lev (Stay Social) <${fromEmail}>`,
        to: [coreyEmail],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return json({ error: "Resend failed", detail: errBody }, 500);
    }

    const resendData = await resendRes.json();
    console.log(`daily-digest: sent ${count} items, email_id=${resendData.id}`);
    return json({ ok: true, email_id: resendData.id, item_count: count });
  } catch (err) {
    console.error("daily-digest error:", err);
    return json({ error: String(err) }, 500);
  }
});
