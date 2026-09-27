import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * send-comment-email
 *
 * Emails the people who need to see a new comment on a post, in the Harbour brand.
 * Called from the app right after a comment is inserted: { comment_id }.
 * Also accepts the legacy trigger payload (same comment_id field).
 *
 * Who gets it:
 *  - anyone tagged on the comment (except AI agents, who go through Telegram)
 *  - the client's users, when the comment is not an internal note
 *  - the Stay Social admins plus the post's assignee and reviewer, when a client wrote it
 * Never the author. A notification_preferences row with email_enabled = false opts out;
 * no row means on. comments.email_sent_at is claimed first so nothing sends twice.
 *
 * When COMMENT_REPLY_DOMAIN is set (replies.staysocial.ca), each email gets its own
 * reply-to, reply+<token>@<domain>, and a reply to it becomes the person's comment on the
 * post (see inbound-comment-reply). Without it, replies go to COMMENT_REPLY_TO.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://hub.staysocial.ca";
const SS_ROLES = ["ss_admin", "ss_team", "ss_producer", "ss_ops", "ss_manager"];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function firstName(name: string | null | undefined, email: string): string {
  const n = (name || "").trim();
  if (n && !n.includes("@")) return n.split(/\s+/)[0];
  return email.split("@")[0];
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Halifax",
  }).format(d);
}

const STATUS_LABEL: Record<string, string> = {
  client_approval: "Waiting for your approval",
  request_changes: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

export function buildEmail(opts: {
  recipientFirst: string;
  reason: "mention" | "client" | "team";
  authorName: string;
  authorIsClient: boolean;
  body: string;
  postId: string;
  postTitle: string;
  clientName: string | null;
  scheduledAt: string | null;
  status: string | null;
  isInternal: boolean;
  replyByEmail?: boolean;
}): { subject: string; html: string; text: string } {
  const title = opts.postTitle || "Untitled post";
  const when = formatDate(opts.scheduledAt);
  const status = opts.status ? STATUS_LABEL[opts.status] || null : null;
  const postUrl = `${APP_URL}/pipeline/${opts.postId}`;

  const subject =
    opts.reason === "mention"
      ? `${opts.authorName} tagged you on "${title}"`
      : `${opts.authorName} commented on "${title}"`;

  const lead =
    opts.reason === "mention"
      ? `${opts.authorName} tagged you in a comment on this post.`
      : opts.reason === "team"
        ? `${opts.authorName} left a note on ${opts.authorIsClient ? "their" : opts.clientName ? `${opts.clientName}'s` : "a client"} post.`
        : `${opts.authorName} left a comment on your post.`;

  const button = opts.authorIsClient ? "Open the post" : "Reply or update the post";

  const metaRows: string[] = [];
  if (opts.clientName && opts.reason !== "client") metaRows.push(`<strong>Client</strong> ${escapeHtml(opts.clientName)}`);
  if (when) metaRows.push(`<strong>Scheduled</strong> ${escapeHtml(when)}`);
  if (status) metaRows.push(`<strong>Status</strong> ${escapeHtml(status)}`);
  if (opts.isInternal) metaRows.push(`<strong>Internal note</strong> not visible to the client`);

  const meta = metaRows.length
    ? `<p style="margin:0 0 20px;color:#4a5560;font-size:14px;line-height:1.7;">${metaRows.join("<br />")}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f2ebdd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2ebdd;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="background:#1a2733;border-radius:16px 16px 0 0;padding:22px 32px;">
              <p style="margin:0;color:#f2ebdd;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Stay Social</p>
              <p style="margin:2px 0 0;color:#c9d1d6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Client HUB</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #ddd3be;border-right:1px solid #ddd3be;">
              <p style="margin:0 0 6px;color:#176e6e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">New comment</p>
              <p style="margin:0 0 18px;color:#1a2733;font-size:22px;font-weight:700;line-height:1.25;">${escapeHtml(title)}</p>
              <p style="margin:0 0 16px;color:#1a2733;font-size:15px;line-height:1.6;">Hi ${escapeHtml(opts.recipientFirst)}, ${escapeHtml(lead)}</p>
              ${meta}
              <div style="margin:0 0 28px;padding:16px 20px;background:#f2ebdd;border-radius:10px;border-left:4px solid #1f8a8a;">
                <p style="margin:0 0 6px;color:#176e6e;font-size:13px;font-weight:600;">${escapeHtml(opts.authorName)}</p>
                <p style="margin:0;color:#1a2733;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.body)}</p>
              </div>
              <div style="text-align:center;">
                <a href="${postUrl}" style="display:inline-block;background:#1f8a8a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">${button}</a>
              </div>
              <p style="margin:24px 0 0;color:#4a5560;font-size:13px;line-height:1.6;text-align:center;">
                ${opts.replyByEmail
                  ? "Or just reply to this email: your reply is added to the post for everyone on it."
                  : opts.reason === "team" ? "Reply in the HUB so the client sees it." : "Replies in the HUB reach us right away. Or just reply to this email and Corey will see it."}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#e9e0cd;border-radius:0 0 16px 16px;padding:18px 32px;text-align:center;border:1px solid #ddd3be;border-top:0;">
              <p style="margin:0;color:#4a5560;font-size:12px;line-height:1.6;">
                Stay Social, proudly Canadian. You get these when someone comments on your content in the HUB.<br />
                To turn them off, change your notification preferences in your profile.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${opts.recipientFirst}, ${lead}`,
    ``,
    `Post: ${title}`,
    when ? `Scheduled: ${when}` : null,
    status ? `Status: ${status}` : null,
    ``,
    `${opts.authorName} wrote:`,
    opts.body,
    ``,
    `${button}: ${postUrl}`,
  ].filter((l) => l !== null).join("\n");

  return { subject, html, text };
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
    const replyTo = Deno.env.get("COMMENT_REPLY_TO") || "corey@staysocial.ca";
    const replyDomain = (Deno.env.get("COMMENT_REPLY_DOMAIN") || "").trim().toLowerCase();
    if (!resendApiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice(7);

    const db = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({}));
    const commentId: string | undefined = payload?.comment_id;
    if (!commentId) return json({ error: "comment_id required" }, 400);

    // Who is calling: the service role (trigger or ops) or a signed-in user.
    let callerId: string | null = null;
    let callerIsStaff = false;
    if (token !== serviceRoleKey) {
      const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await asUser.auth.getUser();
      callerId = userData?.user?.id ?? null;
      if (!callerId) return json({ error: "Unauthorized" }, 401);
      const { data: callerRoles } = await db.from("user_roles").select("role").eq("user_id", callerId);
      callerIsStaff = (callerRoles || []).some((r: any) => SS_ROLES.includes(r.role));
    }

    const { data: comment, error: cErr } = await db
      .from("comments")
      .select("id, post_id, user_id, body, is_internal, mentions, email_sent_at")
      .eq("id", commentId)
      .maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!comment || !comment.post_id) return json({ ok: true, skipped: true, reason: "Not a post comment" });
    if (callerId && callerId !== comment.user_id && !callerIsStaff) return json({ error: "Forbidden" }, 403);

    // Claim the send. If another call already claimed it, stop here.
    const { data: claimed } = await db
      .from("comments")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", commentId)
      .is("email_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) return json({ ok: true, skipped: true, reason: "Already sent" });

    const { data: post } = await db
      .from("posts")
      .select("id, title, client_id, scheduled_at, status_column, assigned_to_user_id, reviewer_user_id, clients(name)")
      .eq("id", comment.post_id)
      .maybeSingle();
    if (!post) return json({ ok: true, skipped: true, reason: "Post missing" });

    const { data: author } = await db.from("users").select("id, name, email").eq("id", comment.user_id).maybeSingle();
    const { data: authorRoles } = await db.from("user_roles").select("role").eq("user_id", comment.user_id);
    const authorIsClient = !(authorRoles || []).some((r: any) => SS_ROLES.includes(r.role) || r.role === "ss_agent");
    const authorName = author?.name || author?.email || "Someone at Stay Social";

    // Recipients, with the reason they are getting it.
    const reasons = new Map<string, "mention" | "client" | "team">();
    const add = (id: string | null | undefined, reason: "mention" | "client" | "team") => {
      if (!id || id === comment.user_id || reasons.has(id)) return;
      reasons.set(id, reason);
    };

    const mentionIds: string[] = Array.isArray(comment.mentions) ? comment.mentions : [];
    if (mentionIds.length) {
      const { data: agentRoles } = await db.from("user_roles").select("user_id").eq("role", "ss_agent").in("user_id", mentionIds);
      const agents = new Set((agentRoles || []).map((r: any) => r.user_id));
      for (const id of mentionIds) if (!agents.has(id)) add(id, "mention");
    }

    if (!comment.is_internal && post.client_id) {
      const { data: clientUsers } = await db.from("users").select("id").eq("client_id", post.client_id);
      for (const u of clientUsers || []) add(u.id, "client");
    }

    if (authorIsClient) {
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "ss_admin");
      for (const r of admins || []) add(r.user_id, "team");
      add(post.assigned_to_user_id, "team");
      add(post.reviewer_user_id, "team");
    }

    if (reasons.size === 0) return json({ ok: true, skipped: true, reason: "No recipients" });

    const ids = Array.from(reasons.keys());
    const { data: optedOut } = await db
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", ids)
      .eq("email_enabled", false);
    for (const r of optedOut || []) reasons.delete(r.user_id);

    const { data: users } = await db.from("users").select("id, name, email").in("id", Array.from(reasons.keys()));
    const recipients = (users || []).filter((u: any) => u.email && reasons.has(u.id));
    if (recipients.length === 0) return json({ ok: true, skipped: true, reason: "No email addresses or all opted out" });

    const clientName = (post as any).clients?.name ?? null;

    // One reply token per recipient, so a reply lands on this post as that person.
    const tokens = new Map<string, string>();
    if (replyDomain) {
      const rows = recipients.map((u: any) => {
        const token = crypto.randomUUID().replace(/-/g, "");
        tokens.set(u.id, token);
        return { token, post_id: post.id, user_id: u.id, comment_id: comment.id };
      });
      const { error: tokErr } = await db.from("comment_reply_tokens").insert(rows);
      if (tokErr) {
        console.warn("reply token insert failed, falling back to plain reply-to:", tokErr.message);
        tokens.clear();
      }
    }

    const messages = recipients.map((u: any) => {
      const { subject, html, text } = buildEmail({
        recipientFirst: firstName(u.name, u.email),
        reason: reasons.get(u.id)!,
        authorName,
        authorIsClient,
        body: comment.body || "",
        postId: post.id,
        postTitle: post.title,
        clientName,
        scheduledAt: post.scheduled_at,
        status: post.status_column,
        isInternal: !!comment.is_internal,
        replyByEmail: tokens.has(u.id),
      });
      const token = tokens.get(u.id);
      const reply = token ? `reply+${token}@${replyDomain}` : replyTo;
      return { from: `Stay Social <${fromEmail}>`, to: [u.email], reply_to: reply, subject, html, text };
    });

    const resendRes = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      // Release the claim so a retry can send.
      await db.from("comments").update({ email_sent_at: null }).eq("id", commentId);
      return json({ error: "Failed to send email", detail: errBody }, 500);
    }

    return json({ ok: true, recipients: recipients.map((u: any) => ({ id: u.id, reason: reasons.get(u.id) })) });
  } catch (err) {
    console.error("send-comment-email error:", err);
    return json({ error: String(err) }, 500);
  }
});
