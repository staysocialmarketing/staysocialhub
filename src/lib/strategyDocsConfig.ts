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
  {
    clientName: "Wheeler Mortgage",
    pathToken: "70d3ac6e-a87a-4cb2-be06-1646470b05a1",
    docs: [],
  },
  {
    clientName: "Francine Casault",
    pathToken: "bc8fdc6d-c55e-43a3-9102-324ab7fa3308",
    docs: [],
  },
  {
    clientName: "Danielle Gibson",
    pathToken: "3e62fdb5-49a9-4d4a-b77b-f1ec134a2418",
    docs: [],
  },
  {
    clientName: "Lesley Tenaglia",
    pathToken: "388b23ba-9e74-4c0a-b8a9-5840845c81fe",
    docs: [],
  },
  {
    clientName: "Scott Pattinson",
    pathToken: "9e4e9e6a-fadf-4cb4-91fb-46ac47ee24cb",
    docs: [],
  },
  {
    clientName: "Alex Spicer",
    pathToken: "08993104-9645-4fa7-b480-4a5e77bdf2b2",
    docs: [],
  },
  {
    clientName: "Craig Spicer",
    pathToken: "8c86b2a1-a2ef-4965-b4f5-cce64b001c13",
    docs: [],
  },
  {
    clientName: "Danny Bell",
    pathToken: "2edef211-0ca8-4900-9c6f-1ca63b9556ca",
    docs: [],
  },
  {
    clientName: "Jennifer MacLennan",
    pathToken: "eea58e17-742c-4126-823d-292354764442",
    docs: [],
  },
  {
    clientName: "Karen B",
    pathToken: "33519f90-6778-4614-9514-62052a6fcfbc",
    docs: [],
  },
  {
    clientName: "Kevin Byworth",
    pathToken: "7ceb0f41-6560-4aee-b2da-aa96ee6676ef",
    docs: [],
  },
  {
    clientName: "Kirk Eaton",
    pathToken: "4fa57f9a-1d40-4864-86fa-faf979ae1f0e",
    docs: [],
  },
  {
    clientName: "Lendrific",
    pathToken: "e48e5435-072d-419b-af16-eb7c0c088522",
    docs: [],
  },
  {
    clientName: "Nikki Carew",
    pathToken: "c8118a10-7131-4df7-b77e-5c972c9d309b",
    docs: [],
  },
  {
    clientName: "Premiere Mortgage",
    pathToken: "5a7c2f23-0438-483b-bffe-ba05fdd96bf9",
    docs: [],
  },
  {
    clientName: "Rico Johnston",
    pathToken: "93e78adf-a3a6-4ddf-bb50-cb34057b362b",
    docs: [],
  },
  {
    clientName: "Tracy MacIntyre",
    pathToken: "0ab27a09-553a-4b57-86fd-dd26dc237793",
    docs: [],
  },
];
