/**
 * QuickBooks GL Export Parser
 * Parses .xlsx/.csv GL detail exports into structured expense records.
 *
 * Expected format (QuickBooks Canadian GL Detail Report):
 * Col B (idx 1): Transaction date (DD/MM/YYYY)
 * Col C (idx 2): Transaction type (Expense, Bill, Journal Entry)
 * Col D (idx 3): Reference number
 * Col E (idx 4): Vendor name (sometimes empty)
 * Col F (idx 5): Description
 * Col G (idx 6): GL account full name
 * Col H (idx 7): Payment method
 * Col I (idx 8): Amount
 * Col J (idx 9): Running balance
 */

export interface ParsedExpense {
  transaction_date: string; // YYYY-MM-DD
  transaction_type: string;
  ref_number: string;
  vendor_name: string;
  description: string;
  gl_account: string;
  payment_method: string;
  amount: number;
  balance: number | null;
  category: string;
  auto_categorized: boolean;
}

export interface ParseResult {
  expenses: ParsedExpense[];
  date_range_start: string;
  date_range_end: string;
  gl_account: string;
  skipped_rows: number;
}

// Vendor auto-categorization rules
const VENDOR_RULES: Array<{ pattern: RegExp; vendor: string; category: string }> = [
  { pattern: /CANVA/i, vendor: "Canva", category: "Software & Tools" },
  { pattern: /HIGHLEVEL|GOHIGHLEVEL/i, vendor: "GoHighLevel", category: "Software & Tools" },
  { pattern: /GODADDY|DNH\*/i, vendor: "GoDaddy", category: "Domains & Hosting" },
  { pattern: /ANTHROPIC/i, vendor: "Anthropic", category: "Software & Tools" },
  { pattern: /ANTIMATTER/i, vendor: "Antimatter Creative Lab", category: "Creative Services" },
  { pattern: /VERCEL/i, vendor: "Vercel", category: "Software & Tools" },
  { pattern: /GITHUB/i, vendor: "GitHub", category: "Software & Tools" },
  { pattern: /FIGMA/i, vendor: "Figma", category: "Software & Tools" },
  { pattern: /ADOBE/i, vendor: "Adobe", category: "Software & Tools" },
  { pattern: /GOOGLE\s*(ADS|CLOUD)/i, vendor: "Google", category: "Advertising" },
  { pattern: /META\s*(ADS|PLATFORM)/i, vendor: "Meta", category: "Advertising" },
  { pattern: /FACEBOOK\s*ADS/i, vendor: "Meta", category: "Advertising" },
];

function parseDateDDMMYYYY(dateStr: string): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // DD/MM/YYYY format
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Excel serial date number
  const num = Number(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date((num - 25569) * 86400000);
    return date.toISOString().split("T")[0];
  }

  return null;
}

function categorize(vendorName: string, description: string, amount: number): { vendor: string; category: string } {
  const combined = `${vendorName} ${description}`.trim();

  // Negative journal entries = chargebacks/credits
  if (amount < 0 && /journal|chargeback/i.test(combined)) {
    return { vendor: vendorName || "Chargeback", category: "Chargebacks & Credits" };
  }

  for (const rule of VENDOR_RULES) {
    if (rule.pattern.test(combined)) {
      return { vendor: rule.vendor, category: rule.category };
    }
  }

  // Use the vendor name from the "Name" column if available
  if (vendorName && vendorName.trim()) {
    return { vendor: vendorName.trim(), category: "Other" };
  }

  return { vendor: "Unknown", category: "Other" };
}

export function parseGLExport(rows: any[][]): ParseResult {
  const expenses: ParsedExpense[] = [];
  let skipped = 0;
  let glAccount = "";

  for (const row of rows) {
    // Skip empty rows
    if (!row || row.every((c) => !c)) {
      skipped++;
      continue;
    }

    // Skip header rows (look for "Transaction date" text)
    if (String(row[1] || "").includes("Transaction date") || String(row[1] || "").includes("Transaction type")) {
      skipped++;
      continue;
    }

    // Skip metadata/total rows
    const firstCell = String(row[0] || row[1] || "").trim();
    if (/^(MCC|Total|TOTAL|Accrual|Cash)\b/i.test(firstCell)) {
      // Capture GL account name from metadata if present
      if (/^50\d{3}/i.test(firstCell)) {
        glAccount = firstCell;
      }
      skipped++;
      continue;
    }

    // Parse the date
    const dateStr = parseDateDDMMYYYY(String(row[1] || ""));
    if (!dateStr) {
      skipped++;
      continue;
    }

    const amount = parseFloat(String(row[8] || "0"));
    if (isNaN(amount) || amount === 0) {
      skipped++;
      continue;
    }

    const rawVendor = String(row[4] || "").trim();
    const description = String(row[5] || "").trim();
    const { vendor, category } = categorize(rawVendor, description, amount);

    // Extract GL account from row if present
    const rowGlAccount = String(row[6] || "").trim();
    if (rowGlAccount && rowGlAccount.includes("50")) {
      glAccount = rowGlAccount;
    }

    expenses.push({
      transaction_date: dateStr,
      transaction_type: String(row[2] || "").trim(),
      ref_number: String(row[3] || "").trim(),
      vendor_name: vendor,
      description: description || rawVendor,
      gl_account: rowGlAccount,
      payment_method: String(row[7] || "").trim(),
      amount,
      balance: row[9] != null ? parseFloat(String(row[9])) : null,
      category,
      auto_categorized: true,
    });
  }

  // Sort by date
  expenses.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  const dates = expenses.map((e) => e.transaction_date).filter(Boolean);

  return {
    expenses,
    date_range_start: dates[0] || "",
    date_range_end: dates[dates.length - 1] || "",
    gl_account: glAccount,
    skipped_rows: skipped,
  };
}
