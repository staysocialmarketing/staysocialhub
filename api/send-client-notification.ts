import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const APP_URL = "https://hub.staysocial.ca";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildEmail(opts: {
  clientName: string;
  postTitles: string[];
  isReminder: boolean;
}): { subject: string; html: string } {
  const { clientName, postTitles, isReminder } = opts;
  const safeClientName = escapeHtml(clientName);
  const approvalUrl = `${APP_URL}/pipeline`;
  const postCount = postTitles.length;

  const subject = isReminder
    ? "Reminder: Content waiting for your approval"
    : "Your content is ready for review";

  const intro = isReminder
    ? `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        This is a friendly reminder that you have <strong>${postCount} post${postCount !== 1 ? "s" : ""}</strong> waiting for your approval.
        Your content is ready to go — just need your sign-off before we can schedule!
      </p>`
    : `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        You have <strong>${postCount} post${postCount !== 1 ? "s" : ""}</strong> ready for your review and approval in the Stay Social HUB.
      </p>`;

  const urgencyNote = isReminder
    ? `<p style="margin:0 0 24px;color:#92400e;font-size:13px;line-height:1.5;background:#fef3c7;border-radius:8px;padding:12px 16px;">
        &#x23F0; <strong>Heads up:</strong> Delays in approval may affect your scheduled posting dates. Please review as soon as you can.
      </p>`
    : "";

  const postListItems = postTitles
    .map(
      (title) =>
        `<li style="padding:6px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">${escapeHtml(title)}</li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="background:#0f0f0f;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
              <p style="margin:0;color:#ff6b35;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                Stay Social
              </p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:2px;">
                CLIENT HUB
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 20px;color:#111827;font-size:18px;font-weight:600;">
                Hello ${safeClientName},
              </p>
              ${intro}
              ${urgencyNote}
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                Content awaiting your review
              </p>
              <ul style="margin:0 0 28px;padding:0;list-style:none;border-top:1px solid #f3f4f6;">
                ${postListItems}
              </ul>
              <div style="text-align:center;">
                <a href="${approvalUrl}"
                   style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  Review &amp; Approve Content &rarr;
                </a>
              </div>
              <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;text-align:center;">
                Or visit <a href="${approvalUrl}" style="color:#ff6b35;text-decoration:none;">${APP_URL}</a> and sign in to your account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border:1px solid #e5e7eb;border-top:0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                You're receiving this because you're a client of Stay Social.<br />
                Questions? Reply to this email or reach out to your account manager.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@staysocial.ca";
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return res.status(500).json({ error: "Supabase environment variables not configured" });
    }

    // Verify caller is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { client_id, is_reminder = false } = req.body || {};
    if (!client_id) return res.status(400).json({ error: "client_id required" });

    // Fetch all posts in client_approval for this client
    const { data: approvalPosts, error: postsErr } = await serviceClient
      .from("posts")
      .select("id, title")
      .eq("client_id", client_id)
      .eq("status_column", "client_approval");

    if (postsErr) {
      console.error("Posts query error:", postsErr);
      return res.status(500).json({ error: "Failed to query posts" });
    }

    if (!approvalPosts || approvalPosts.length === 0) {
      return res.status(404).json({ error: "No posts awaiting client approval" });
    }

    const postTitles = approvalPosts.map((p: any) => p.title).filter(Boolean);

    // Fetch client name
    const { data: client } = await serviceClient
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .single();

    const clientName = client?.name || "there";

    // Fetch client users (client_admin + client_assistant) for this client
    const { data: clientUsers } = await serviceClient
      .from("users")
      .select("id, email, name")
      .eq("client_id", client_id);

    const { data: clientRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["client_admin", "client_assistant"]);

    const roleUserIds = new Set((clientRoles || []).map((r: any) => r.user_id));
    const recipients = (clientUsers || []).filter(
      (u: any) => u.email && roleUserIds.has(u.id)
    );

    if (recipients.length === 0) {
      return res.status(404).json({ error: "No client email on file" });
    }

    const { subject, html } = buildEmail({
      clientName,
      postTitles,
      isReminder: is_reminder,
    });

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Stay Social <${fromEmail}>`,
        to: recipients.map((r: any) => r.email),
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return res.status(500).json({ error: "Failed to send email", detail: errBody });
    }

    // Log to client_activity
    await serviceClient.from("client_activity").insert({
      client_id,
      activity_type: "manual_notification",
      title: "Approval notification sent",
      visible_to_client: false,
      created_by_user_id: user.id,
    });

    const resendData = await resendRes.json();
    return res.status(200).json({
      ok: true,
      posts_count: approvalPosts.length,
      recipients: recipients.length,
      email_id: resendData.id,
    });
  } catch (err: any) {
    console.error("send-client-notification error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
