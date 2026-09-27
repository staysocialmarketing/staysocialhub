import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * inbound-comment-reply
 *
 * Resend calls this (event email.received) when someone replies to a HUB comment email.
 * The reply-to address carries a token, reply+<token>@<reply domain>, that names the post and
 * the person. The reply becomes their comment on the post, and the team is emailed through
 * send-comment-email as for any client comment.
 *
 * Checks, in order: Svix signature, event type, token present and not expired, sender matches
 * the token's user, not an auto-reply, something left after the quoted part is stripped.
 * Every received email is logged once in inbound_email_log; a webhook retry is a no-op.
 *
 * Secrets: RESEND_WEBHOOK_SECRET (whsec_...), RESEND_API_KEY, SUPABASE_* (provided).
 */

const TOLERANCE_SECONDS = 300;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Svix / Resend webhook signature. */
export async function verifySignature(opts: {
  secret: string; id: string | null; timestamp: string | null; signature: string | null; body: string; now?: number;
}): Promise<boolean> {
  const { secret, id, timestamp, signature, body } = opts;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = bytesToB64(mac);
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && sig && timingSafeEqual(sig, expected);
  });
}

export function extractToken(addresses: string[]): string | null {
  for (const a of addresses) {
    const m = /reply\+([a-f0-9]{16,64})@/i.exec(a);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export function extractEmail(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1] : from).trim().toLowerCase();
}

function htmlToText(html: string): string {
  return html
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<div class="gmail_quote[\s\S]*$/i, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/\r/g, "");
}

/** Keep what the person typed, drop the quoted message underneath and mail-app signatures. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  const cutters: RegExp[] = [
    /^\s*On .{0,200}wrote:\s*$/i,               // Gmail, Apple Mail: On Mon, Sep 28, 2026 at 9:00 AM Corey wrote:
    /^\s*Le .{0,200}a écrit\s*:\s*$/i,           // French mail apps
    /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i, // Outlook classic
    /^\s*_{5,}\s*$/,                             // Outlook separator line
    /^\s*From:\s.+$/i,                           // Outlook quoted header block
    /^\s*Sent from my (iPhone|iPad|Galaxy|Samsung|Android|BlackBerry).*$/i,
    /^\s*Get Outlook for (iOS|Android).*$/i,
    /^\s*>/,                                     // quoted line
  ];
  const kept: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (cutters.some((re) => re.test(line))) break;
    kept.push(line);
  }
  // Gmail sometimes wraps the "On ... wrote:" line onto two lines.
  const joined = kept.join("\n");
  const wrapped = /\n\s*On .{0,200}\n.{0,120}wrote:\s*$/i.exec(joined);
  const body = wrapped ? joined.slice(0, wrapped.index) : joined;
  return body.replace(/\n{3,}/g, "\n\n").trim();
}

function isAutoReply(headers: Record<string, string>, subject: string): boolean {
  const h = (k: string) => (headers[k] || headers[k.toLowerCase()] || "").toLowerCase();
  if (h("auto-submitted") && h("auto-submitted") !== "no") return true;
  if (h("x-autoreply") || h("x-autorespond")) return true;
  if (/^(auto_reply|bulk|junk)$/.test(h("precedence"))) return true;
  return /^(automatic reply|auto(matic)?[- ]?reply|out of (the )?office)/i.test(subject.trim());
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!secret || !resendApiKey) return new Response("Not configured", { status: 500 });

  const rawBody = await req.text();
  const ok = await verifySignature({
    secret,
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
    body: rawBody,
  });
  if (!ok) return new Response("Bad signature", { status: 401 });

  // From here on always answer 200 so Resend does not retry; the log holds the outcome.
  const done = (outcome: string, detail?: string) =>
    new Response(JSON.stringify({ ok: true, outcome, detail }), { headers: { "Content-Type": "application/json" } });

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return done("bad_json"); }
  if (event?.type !== "email.received") return done("ignored_event", event?.type);

  const data = event.data || {};
  const emailId: string = data.email_id;
  const toList: string[] = Array.isArray(data.to) ? data.to : [];
  const fromEmail = extractEmail(String(data.from || ""));
  const subject = String(data.subject || "");
  if (!emailId) return done("no_email_id");

  const db = createClient(supabaseUrl, serviceRoleKey);

  // One log row per received email. A retry hits the unique constraint and stops here.
  const { error: logErr } = await db.from("inbound_email_log").insert({
    resend_email_id: emailId, from_email: fromEmail, to_email: toList.join(", "), subject, outcome: "received",
  });
  if (logErr) return done("already_processed", logErr.message);
  const finish = async (outcome: string, detail?: string, commentId?: string) => {
    await db.from("inbound_email_log").update({ outcome, detail: detail ?? null, comment_id: commentId ?? null }).eq("resend_email_id", emailId);
    return done(outcome, detail);
  };

  const token = extractToken([...toList, ...(Array.isArray(data.received_for) ? data.received_for : [])]);
  if (!token) return finish("no_token");

  const { data: tok } = await db
    .from("comment_reply_tokens")
    .select("token, post_id, user_id, expires_at, used_count")
    .eq("token", token)
    .maybeSingle();
  if (!tok) return finish("unknown_token");
  if (new Date(tok.expires_at).getTime() < Date.now()) return finish("expired_token");

  const { data: user } = await db.from("users").select("id, email, name").eq("id", tok.user_id).maybeSingle();
  if (!user?.email) return finish("no_user");
  if (user.email.toLowerCase() !== fromEmail) return finish("sender_mismatch", `${fromEmail} is not ${user.email}`);

  // Full message from Resend: body, headers, attachments, authentication results.
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  });
  if (!res.ok) return finish("fetch_failed", `${res.status} ${await res.text()}`);
  const mail: any = await res.json();
  const headers: Record<string, string> = mail.headers && typeof mail.headers === "object" ? mail.headers : {};

  if (isAutoReply(headers, subject)) return finish("auto_reply");

  // If Resend reports authentication results, require SPF or DKIM to pass.
  const auth = mail.authentication || mail.security || mail.auth || null;
  if (auth && typeof auth === "object") {
    const result = (v: any) => (typeof v === "string" ? v : v?.result || v?.status || "").toString().toLowerCase();
    const spf = result(auth.spf), dkim = result(auth.dkim);
    if ((spf || dkim) && spf !== "pass" && dkim !== "pass") return finish("auth_failed", `spf=${spf} dkim=${dkim}`);
  }

  const rawText: string = typeof mail.text === "string" && mail.text.trim() ? mail.text : htmlToText(String(mail.html || ""));
  let body = stripQuoted(rawText);
  if (!body) return finish("empty_after_strip");

  const attachments: any[] = Array.isArray(mail.attachments) ? mail.attachments : Array.isArray(data.attachments) ? data.attachments : [];
  const real = attachments.filter((a) => a && a.content_disposition !== "inline");
  if (real.length) {
    const names = real.map((a) => a.filename).filter(Boolean).join(", ");
    body += `\n\n(${real.length} attachment${real.length === 1 ? "" : "s"} sent by email: ${names})`;
  }

  const { data: comment, error: cErr } = await db
    .from("comments")
    .insert({ post_id: tok.post_id, user_id: tok.user_id, body, is_internal: false, mentions: [], source: "email" })
    .select("id")
    .single();
  if (cErr || !comment) return finish("insert_failed", cErr?.message);

  await db.from("comment_reply_tokens")
    .update({ used_count: (tok.used_count || 0) + 1, last_used_at: new Date().toISOString() })
    .eq("token", token);

  // Tell the team the way any client comment does. Non-fatal if it fails; the comment is in.
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-comment-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: comment.id }),
    });
  } catch (e) {
    console.warn("send-comment-email after inbound reply failed:", e);
  }

  return finish("posted", undefined, comment.id);
});
