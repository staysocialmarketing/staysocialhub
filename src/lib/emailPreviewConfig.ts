export type TemplateType = "announcement" | "newsletter" | "cta" | "seasonal" | "boc" | "database" | "campaign";

export interface EmailTemplate {
  label: string;
  description: string;
  file: string;
  type: TemplateType;
}

export interface EmailPreviewClient {
  name: string;
  /** If set, used for DB name matching instead of name. Use when display name differs from clients.name in DB. */
  clientDbName?: string;
  subtitle?: string;
  templates: EmailTemplate[];
}

export const emailPreviewClients: Record<string, EmailPreviewClient> = {
  // Wheeler Mortgage
  "70d3ac6e-a87a-4cb2-be06-1646470b05a1": {
    name: "Wheeler Mortgage",
    subtitle: "Matthew Wheeler · Associate Mortgage Broker",
    templates: [
      {
        label: "Announcement",
        description: "Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Newsletter",
        description: "The Wheeler Brief — monthly mortgage roundup.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign",
        description: "Renewal season and lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Three Clients Asked Me the Same Thing",
        description: "Halifax summer market breakdown: $350K–$500K vs $500K+, readiness message.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — A First-Time Buyer's Journey (Muppets Edition)",
        description: "Arlo's FTB journey: pre-approval, offer in Dartmouth, keys. Wheeler Street Muppets.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // AG Mortgage Team — clients.name in DB is "Andrew Gad", display name kept as "AG Mortgage Team"
  "11cc8a9c-abb1-4e27-b24d-dc573bdfa449": {
    name: "AG Mortgage Team",
    clientDbName: "Andrew Gad",
    subtitle: "Andrew Gad · Mortgage Agent Level 2 · Premiere Mortgage Centre",
    templates: [
      {
        label: "Announcement",
        description: "Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Newsletter",
        description: "Monthly mortgage brief — rates, market signals, Q&A.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign",
        description: "Renewal season and lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "Seasonal Strategy Email",
        description: "Jan/Mar/Sep strategy emails — renewal season, spring market, fall Q4.",
        file: "seasonal-strategy.html",
        type: "seasonal",
      },
      {
        label: "BoC Rate Decision Email",
        description: "Same-day send on BoC announcements — sophisticated take for high-value clients.",
        file: "boc-rate-decision.html",
        type: "boc",
      },
      {
        label: "Database Mining Email",
        description: "Trigger-based campaigns — renewal windows, equity extraction, rate strategy.",
        file: "database-mining.html",
        type: "database",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Spring window — what Toronto move-up buyers should know now",
        description: "Move-up buyer spring window: full purchasing position, bridge financing, pre-underwritten file.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Bank of Canada [held/cut] — here's what it means for your mortgage",
        description: "BoC reactive template (June 10): variable rate, renewal, purchase segments. [FILL] markers for Tristan.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Francine Casault
  "bc8fdc6d-c55e-43a3-9102-324ab7fa3308": {
    name: "Francine Casault",
    subtitle: "Mortgage Agent Level 2 · Premiere Mortgage Centre",
    templates: [
      {
        label: "Announcement",
        description: "Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Newsletter",
        description: "Monthly mortgage brief — rates, market signals, Q&A.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign",
        description: "Renewal season and lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Everyone Deserves a Home (Pride Month)",
        description: "Inclusive broker positioning, same-sex couple story, Pride Month theme.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Federal Employee Pension Income",
        description: "How federal pension income qualifies for mortgages — education for Ottawa clients.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Danielle Gibson
  "3e62fdb5-49a9-4d4a-b77b-f1ec134a2418": {
    name: "Danielle Gibson",
    subtitle: "Mortgage Broker",
    templates: [
      {
        label: "Announcement — Version A",
        description: "Dark hero. Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Announcement — Version B",
        description: "Light peach hero. Same layout, warmer colour feel.",
        file: "announcement-v2.html",
        type: "announcement",
      },
      {
        label: "Newsletter — Version A",
        description: "Dark hero. The Mortgage Brief — monthly roundup.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "Newsletter — Version B",
        description: "Light peach hero. Same layout, warmer colour feel.",
        file: "newsletter-v2.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign — Version A",
        description: "Dark hero. Renewal season, lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "CTA Campaign — Version B",
        description: "Light peach hero. Same layout, warmer colour feel.",
        file: "cta-campaign-v2.html",
        type: "cta",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — This Month, Something Really Good Happened",
        description: "Giveback announcement — client's charity, contribution amount, cumulative total. [FILL] markers included.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Champagne & Closings",
        description: "Milestone celebration framework — closing stories, referral culture, what's possible.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Lesley Tenaglia
  "388b23ba-9e74-4c0a-b8a9-5840845c81fe": {
    name: "Lesley Tenaglia",
    subtitle: "Mortgage Broker · Fuse Mortgage",
    templates: [
      {
        label: "Announcement",
        description: "Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Newsletter",
        description: "Monthly mortgage brief — rates, market signals, Q&A.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign",
        description: "Renewal season and lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — The Pivot Announcement",
        description: "Alt lending repositioning — honest admission banks have better rates, Fuse going all-in on B/private.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC & B-Lender Implications",
        description: "How the June 10 rate decision affects alt lending, stress test, and Lesley's client strategies.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Scott Pattinson
  "9e4e9e6a-fadf-4cb4-91fb-46ac47ee24cb": {
    name: "Scott Pattinson",
    subtitle: "Mortgage Agent · Blue Rhino",
    templates: [
      {
        label: "Announcement",
        description: "Rate updates, market news, policy changes.",
        file: "announcement.html",
        type: "announcement",
      },
      {
        label: "Newsletter",
        description: "The Blue Rhino Brief — monthly mortgage roundup.",
        file: "newsletter.html",
        type: "newsletter",
      },
      {
        label: "CTA Campaign",
        description: "Renewal season and lead generation campaigns.",
        file: "cta-campaign.html",
        type: "cta",
      },
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — I Check My Clients' Files Every Month",
        description: "POP Framework intro — proactive file review, 35bps savings story, RESP redirect.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Self-Employed Mortgage Qualification",
        description: "Full breakdown: T1 generals, corp T4, retained earnings, stated income programs.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Alex Spicer
  "08993104-9645-4fa7-b480-4a5e77bdf2b2": {
    name: "Alex Spicer",
    subtitle: "Associate Mortgage Broker · Premiere Mortgage Centre",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Same Rate Cut, Two Different Markets",
        description: "BoC June 10: what it means for Halifax buyers vs Toronto buyers — two-region breakdown.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC Two-Region Read",
        description: "Follow-up rate analysis with cross-market context for NS and ON clients.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Craig Spicer
  "8c86b2a1-a2ef-4965-b4f5-cce64b001c13": {
    name: "Craig Spicer",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Craig's June Market Read",
        description: "Summer market conditions, what buyers need to know now in the Halifax/Dartmouth area.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC June 10 Analysis",
        description: "Rate decision breakdown for Craig's NS client base.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Danny Bell
  "2edef211-0ca8-4900-9c6f-1ca63b9556ca": {
    name: "Danny Bell",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre · strictly-business.ca",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — The Condition-Free Appraisal Gap",
        description: "Three buyer scenarios ($500K, $650K, $850K) — appraisal gap strategy for Durham/GTA.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC June 10: Conditions Lens",
        description: "How the rate call affects conditional offers, appraisal risk, and Danny's buyer strategy.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Jennifer MacLennan
  "eea58e17-742c-4126-823d-292354764442": {
    name: "Jennifer MacLennan",
    subtitle: "Associate Mortgage Broker · Premiere Mortgage Centre",
    templates: [],
  },

  // Karen B
  "33519f90-6778-4614-9514-62052a6fcfbc": {
    name: "Karen B",
    subtitle: "Mortgage Professional · One Link Mortgage & Financial",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Winnipeg Summer Market Snapshot",
        description: "Three Winnipeg price tiers, what buyers are seeing in the summer market.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Zoe's Take: BoC Rate Decision",
        description: "Zoe's character-led take on the June 10 announcement, $385K variable payment math. [FILL] markers included.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Kevin Byworth
  "7ceb0f41-6560-4aee-b2da-aa96ee6676ef": {
    name: "Kevin Byworth",
    subtitle: "Mortgage Agent Level 2 · Premiere Mortgage Centre",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Reverse Mortgage Education",
        description: "CHIP LTV Stretch, 5.99% 3-year special, Kevin & Felicia partnership intro.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC Calm Explainer",
        description: "Rate decision for three segments: purchases, renewals, reverse mortgage clients. [FILL] for GTA payment math.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Kirk Eaton
  "4fa57f9a-1d40-4864-86fa-faf979ae1f0e": {
    name: "Kirk Eaton",
    subtitle: "Mortgage Agent · Eaton Mortgage Group",
    templates: [],
  },

  // Lendrific
  "e48e5435-072d-419b-af16-eb7c0c088522": {
    name: "Lendrific",
    subtitle: "Erwin Sirbu & Aaryon Gaeeni · Toronto",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — What $800K Buys in Toronto Right Now",
        description: "Toronto summer market: East York, Leslieville, Etobicoke, North York at $800K.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC Data Breakdown",
        description: "Rate decision analysis with $800K and $600K Toronto payment math. [FILL] markers included.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Nikki Carew
  "c8118a10-7131-4df7-b77e-5c972c9d309b": {
    name: "Nikki Carew",
    subtitle: "Mortgage Agent · Premiere Mortgage Centre · St. John's, NL",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — What Your Money Actually Buys in NL Right Now",
        description: "NL summer market: St. John's, Gander, Corner Brook price tiers and conditions.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — The Rate Decision: What It Means Here",
        description: "BoC June 10 through a Newfoundland lens. [FILL] for $320K variable payment math.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Premiere Mortgage
  "5a7c2f23-0438-483b-bffe-ba05fdd96bf9": {
    name: "Premiere Mortgage",
    subtitle: "Independent Mortgage Brokerage",
    templates: [],
  },

  // Rico Johnston
  "93e78adf-a3a6-4ddf-bb50-cb34057b362b": {
    name: "Rico Johnston",
    subtitle: "Mortgage Broker · Good Fit Mortgage Solutions",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — Sudbury Summer Market Snapshot",
        description: "Three price tiers for Northern Ontario buyers — what's moving and where.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — BoC June 10: Northern Ontario Lens",
        description: "Rate decision impact for mine workers, teachers, and Sudbury buyers.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

  // Tracy MacIntyre
  "0ab27a09-553a-4b57-86fd-dd26dc237793": {
    name: "Tracy MacIntyre",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre",
    templates: [
      {
        label: "Campaign Template",
        description: "Base template for branded campaign emails.",
        file: "email-campaign.html",
        type: "campaign",
      },
      {
        label: "June Email 1 — What Your Bank's Renewal Letter Isn't Telling You",
        description: "36 years inside the institution — the first offer isn't the best, 120-day window strategy.",
        file: "june-email-1.html",
        type: "campaign",
      },
      {
        label: "June Email 2 — Summer Buying in Atlantic Canada: What the Banks See",
        description: "LTV advantage, public sector employment signal, rural documentation — Atlantic buyer playbook.",
        file: "june-email-2.html",
        type: "campaign",
      },
    ],
  },

};
