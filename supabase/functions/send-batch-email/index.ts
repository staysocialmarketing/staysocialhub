import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function buildEmail(opts: {
  clientName: string;
  batchName: string;
  postTitles: string[];
  isReminder: boolean;
}): { subject: string; html: string } {
  const { clientName, batchName, postTitles, isReminder } = opts;
  const safeClientName = escapeHtml(clientName);
  const safeBatchName = escapeHtml(batchName);
  const approvalUrl = `${APP_URL}/pipeline`;

  const subject = isReminder
    ? `Reminder: Your content is waiting for approval — ${batchName}`
    : `Your content is ready for review — ${batchName}`;

  const intro = isReminder
    ? `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        This is a friendly reminder that your content batch <strong>${safeBatchName}</strong> is still waiting for your approval.
        Your posts are ready to go — just need your sign-off before we can schedule them!
      </p>`
    : `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        Great news! Your content batch <strong>${safeBatchName}</strong> is ready for your review and approval in the Stay Social HUB.
      </p>`;

  const urgencyNote = isReminder
    ? `<p style="margin:0 0 24px;color:#92400e;font-size:13px;line-height:1.5;background:#fef3c7;border-radius:8px;padding:12px 16px;">
        ⏰ <strong>Heads up:</strong> Delays in approval may affect your scheduled posting dates. Please review as soon as you can.
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
                Hello ${safeClientName},
              </p>

              ${intro}
              ${urgencyNote}

              <!-- Post list -->
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                Content in this batch
              </p>
              <ul style="margin:0 0 28px;padding:0;list-style:none;border-top:1px solid #f3f4f6;">
                ${postListItems}
              </ul>

              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${approvalUrl}"
                   style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  Review &amp; Approve Content →
                </a>
              </div>

              <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;text-align:center;">
                Or visit <a href="${approvalUrl}" style="color:#ff6b35;text-decoration:none;">${APP_URL}</a> and sign in to your account.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "hello@staysocial.ca";

    if (!resendApiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the JWT is valid
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { batch_id, is_reminder = false, test_email } = await req.json();
    if (!batch_id) return json({ error: "batch_id required" }, 400);

    // Fetch batch + items + post titles + client name
    const { data: batch, error: batchErr } = await serviceClient
      .from("approval_batches")
      .select(`
        id, name, client_id,
        clients(name),
        approval_batch_items(
          id, post_id,
          posts(id, title)
        )
      `)
      .eq("id", batch_id)
      .single();

    if (batchErr || !batch) return json({ error: "Batch not found" }, 404);

    const clientName = (batch as any).clients?.name || "there";
    const items: Array<{ posts: { title: string } | null }> =
      (batch as any).approval_batch_items || [];
    const postTitles = items
      .map((i) => i.posts?.title)
      .filter((t): t is string => !!t);

    // Fetch client users (client_admin + client_assistant) for this client
    const { data: clientUsers } = await serviceClient
      .from("users")
      .select("id, email, name")
      .eq("client_id", batch.client_id);

    const { data: clientRoles } = await serviceClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["client_admin", "client_assistant"]);

    const roleUserIds = new Set((clientRoles || []).map((r: any) => r.user_id));
    const actualRecipients = (clientUsers || []).filter(
      (u: any) => u.email && roleUserIds.has(u.id)
    );

    // test_email overrides recipients — safe to use for previewing without emailing real clients
    const recipients = test_email
      ? [{ email: test_email, name: "Test" }]
      : actualRecipients;

    if (recipients.length === 0) {
      return json({ error: "No client users found for this batch" }, 404);
    }

    const { subject, html } = buildEmail({
      clientName,
      batchName: batch.name,
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
      return json({ error: "Failed to send email", detail: errBody }, 500);
    }

    const resendData = await resendRes.json();
    return json({ ok: true, email_id: resendData.id, recipients: recipients.length });
  } catch (err) {
    console.error("send-batch-email error:", err);
    return json({ error: String(err) }, 500);
  }
});
