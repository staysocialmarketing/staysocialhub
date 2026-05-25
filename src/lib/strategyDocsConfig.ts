export interface StrategyDoc {
  label: string;
  description: string;
  filename: string;
}

export interface StrategyDocsClient {
  docs: StrategyDoc[];
}

/**
 * Strategy documents per client.
 * Key: same token as emailPreviewClients (Supabase clients.id).
 * Files served from /public/strategy/[token]/[filename]
 * Upload PDFs there to make them available.
 */
export const strategyDocsClients: Record<string, StrategyDocsClient> = {
  // AG Mortgage Team
  "11cc8a9c-abb1-4e27-b24d-dc573bdfa449": {
    docs: [
      {
        label: "2026 Content Strategy",
        description: "Brand positioning, content pillars, monthly rhythm, and platform approach for 2026.",
        filename: "AG_Mortgage_Team_2026_Strategy.pdf",
      },
      {
        label: "2026 Annual Content Plan",
        description: "Month-by-month content calendar with topics, buyer segments, and BoC schedule.",
        filename: "AG_2026_Annual_Content_Plan.pdf",
      },
      {
        label: "2026 Email Campaign Strategy",
        description: "Seasonal emails, BoC rate decision emails, and 9 database mining campaign briefs.",
        filename: "AG_2026_Email_Campaign_Strategy.pdf",
      },
    ],
  },
};
