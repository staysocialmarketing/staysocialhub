export interface StrategyDoc {
  label: string;
  description: string;
  filename: string;
}

export interface StrategyDocsEntry {
  /** Must match clients.name in the DB — used for name-based lookup in ClientDeliverables */
  clientName: string;
  /** Folder name for file serving: /strategy/[pathToken]/[filename] */
  pathToken: string;
  docs: StrategyDoc[];
}

export const strategyDocs: StrategyDocsEntry[] = [
  {
    clientName: "Andrew Gad",
    pathToken: "11cc8a9c-abb1-4e27-b24d-dc573bdfa449",
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
  // Add more clients here — clientName must match clients.name in the DB
  // pathToken can be any unique slug (UUID, client-slug, etc.) — determines the /strategy/[pathToken]/ folder
];
