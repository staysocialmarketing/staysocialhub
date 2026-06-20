import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth — requires valid HUB session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { question, upload_id } = body as { question: string; upload_id?: string };

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build expense context ─────────────────────────────────────────────

    // Fetch all expenses (filtered by upload_id if provided — single tab)
    let expenseQuery = supabase
      .from("premiere_expenses")
      .select("transaction_date, vendor_name, category, amount, description, gl_account")
      .order("transaction_date", { ascending: false });

    if (upload_id) {
      expenseQuery = expenseQuery.eq("upload_id", upload_id);
    }

    const { data: expenses, error: expError } = await expenseQuery;
    if (expError) throw expError;

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ answer: "No expense data available. Please upload a GL export first." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate: by vendor
    const byVendor: Record<string, { total: number; count: number }> = {};
    for (const e of expenses) {
      if (e.amount <= 0) continue;
      const v = e.vendor_name || "Unknown";
      if (!byVendor[v]) byVendor[v] = { total: 0, count: 0 };
      byVendor[v].total += e.amount;
      byVendor[v].count += 1;
    }

    // Aggregate: by category
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      if (e.amount <= 0) continue;
      const c = e.category || "Other";
      byCategory[c] = (byCategory[c] || 0) + e.amount;
    }

    // Aggregate: by month
    const byMonth: Record<string, number> = {};
    for (const e of expenses) {
      if (e.amount <= 0) continue;
      const month = e.transaction_date?.slice(0, 7) ?? "unknown";
      byMonth[month] = (byMonth[month] || 0) + e.amount;
    }

    // Date range
    const dates = expenses.map(e => e.transaction_date).filter(Boolean).sort();
    const dateRangeStart = dates[0];
    const dateRangeEnd = dates[dates.length - 1];
    const totalSpend = expenses.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);
    const totalCredits = expenses.reduce((s, e) => s + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);

    // Top expenses (largest individual transactions)
    const topExpenses = [...expenses]
      .filter(e => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(e => `${e.transaction_date} | ${e.vendor_name} | ${e.category} | $${e.amount.toFixed(2)} | ${e.description || ""}`)
      .join("\n");

    // Format vendor summary (top 15)
    const vendorSummary = Object.entries(byVendor)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 15)
      .map(([v, d]) => `${v}: $${d.total.toFixed(2)} (${d.count} transactions)`)
      .join("\n");

    const categorySummary = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([c, t]) => `${c}: $${t.toFixed(2)}`)
      .join("\n");

    const monthlySummary = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, t]) => `${m}: $${t.toFixed(2)}`)
      .join("\n");

    const dataContext = `
Date range: ${dateRangeStart} to ${dateRangeEnd}
Total transactions: ${expenses.length}
Total spend: $${totalSpend.toFixed(2)}
Total credits/chargebacks: $${totalCredits.toFixed(2)}

SPEND BY VENDOR (top 15):
${vendorSummary}

SPEND BY CATEGORY:
${categorySummary}

SPEND BY MONTH:
${monthlySummary}

TOP 10 INDIVIDUAL TRANSACTIONS:
Date | Vendor | Category | Amount | Description
${topExpenses}
`.trim();

    // ── Call Anthropic ────────────────────────────────────────────────────

    const systemPrompt = `You are George, Don's AI financial assistant for Premiere Mortgage Centre. You have access to the company's advertising and digital expense data and can answer questions about spending, trends, and vendors.

Be concise and specific. Use dollar amounts with $ signs. When comparing periods, show both numbers. Format currency like $1,234.56.
If you don't have enough data to answer confidently, say so clearly.
Never make up numbers — only use the data provided below.
Keep responses focused and under 200 words unless a detailed breakdown is specifically requested.

EXPENSE DATA:
${dataContext}`;

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await anthropicResp.json();
    const answer = aiResult.content?.[0]?.text ?? "I couldn't generate an answer. Please try again.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("george-expenses-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
