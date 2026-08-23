/**
 * Vercel cron handler — /api/cron/daily-digest
 * Runs daily at 12:00 UTC (8:00 AM ADT) per vercel.json schedule.
 * Calls the Supabase edge function which queries the action queue and sends the email.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron auth — only allow GET from Vercel's cron scheduler
  // (Vercel sets Authorization: Bearer <CRON_SECRET> automatically)
  const authHeader = req.headers["authorization"] ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase env vars not configured" });
  }

  try {
    const fnUrl = `${supabaseUrl}/functions/v1/daily-digest`;
    const fnRes = await fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await fnRes.json();
    return res.status(fnRes.ok ? 200 : 502).json(data);
  } catch (err) {
    console.error("daily-digest cron error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
