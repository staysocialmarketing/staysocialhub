import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://hub.staysocial.ca";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildCommentEmail(opts: {
  commenterName: string;
  commentBody: string;
  postTitle: string;
  postId: string;
}): { subject: string; html: string } {
  const { commenterName, commentBody, postTitle, postId } = opts;
  const safeCommenter = escapeHtml(commenterName);
  const safeBody = escapeHtml(commentBody);
  const safeTitle = escapeHtml(postTitle);
  const postUrl = `${APP_URL}/pipeline/${postId}`;

  const subject = `New comment on "${postTitle}" — Stay Social HUB`;

  const html = `<!DOCTYPE html>
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
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

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 20px;color:#111827;font-size:18px;font-weight:600;">
                New Comment on "${safeTitle}"
              </p>

              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                <strong>${safeCommenter}</strong> left a comment:
              </p>

              <!-- Comment body -->
              <div style="margin:0 0 28px;padding:16px 20px;background:#f3f4f6;border-radius:10px;border-left:4px solid #ff6b35;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${safeBody}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${postUrl}"
                   style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  View Post &amp; Reply →
                </a>
              </div>

              <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;text-align:center;">
                Or visit <a href="${APP_URL}" style="color:#ff6b35;text-decoration:none;">${APP_URL}</a> and sign in to your account.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border:1px solid #e5e7eb;border-top:0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                You're receiving this because you have email notifications enabled in the Stay Social HUB.<br />
                To stop these emails, update your notification preferences in your profile settings.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "hello@staysocial.ca";

    if (!resendApiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // This function is called by the database trigger via pg_net with service role key,
    // or can be called directly with a valid auth header.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      comment_id,
      post_id,
      post_title,
      commenter_name,
      comment_body,
      recipient_ids,
    } = await req.json();

    if (!post_id || !recipient_ids || recipient_ids.length === 0) {
      return json({ ok: true, skipped: true, reason: "No recipients" });
    }

    // Check notification preferences — only send to users with email_enabled = true
    const { data: prefs } = await serviceClient
      .from("notification_preferences")
      .select("user_id, email_enabled")
      .in("user_id", recipient_ids);

    // Build a set of users who have explicitly enabled email
    const emailEnabledUsers = new Set<string>();
    if (prefs) {
      for (const p of prefs) {
        if ((p as any).email_enabled) {
          emailEnabledUsers.add((p as any).user_id);
        }
      }
    }

    // If no one has email enabled, skip
    if (emailEnabledUsers.size === 0) {
      return json({ ok: true, skipped: true, reason: "No users with email enabled" });
    }

    // Get email addresses for enabled users
    const { data: users } = await serviceClient
      .from("users")
      .select("id, email, name")
      .in("id", Array.from(emailEnabledUsers));

    const recipients = (users || []).filter((u: any) => u.email);

    if (recipients.length === 0) {
      return json({ ok: true, skipped: true, reason: "No valid email addresses" });
    }

    const { subject, html } = buildCommentEmail({
      commenterName: commenter_name || "Someone",
      commentBody: comment_body || "",
      postTitle: post_title || "Untitled Post",
      postId: post_id,
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
      return json({ error: "Failed to send email", detail: errBody }, 500);
    }

    const resendData = await resendRes.json();
    return json({
      ok: true,
      email_id: resendData.id,
      recipients: recipients.length,
    });
  } catch (err) {
    console.error("send-comment-email error:", err);
    return json({ error: String(err) }, 500);
  }
});
