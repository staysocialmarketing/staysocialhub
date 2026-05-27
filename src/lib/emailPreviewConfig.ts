export type TemplateType = "announcement" | "newsletter" | "cta" | "seasonal" | "boc" | "database";

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
    ],
  },

  // Alex Spicer
  "08993104-9645-4fa7-b480-4a5e77bdf2b2": {
    name: "Alex Spicer",
    subtitle: "Associate Mortgage Broker · Premiere Mortgage Centre",
    templates: [],
  },

  // Craig Spicer
  "8c86b2a1-a2ef-4965-b4f5-cce64b001c13": {
    name: "Craig Spicer",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre",
    templates: [],
  },

  // Danny Bell
  "2edef211-0ca8-4900-9c6f-1ca63b9556ca": {
    name: "Danny Bell",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre · strictly-business.ca",
    templates: [],
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
    subtitle: "Mortgage Broker · One Link Mortgage & Financial",
    templates: [],
  },

  // Kevin Byworth
  "7ceb0f41-6560-4aee-b2da-aa96ee6676ef": {
    name: "Kevin Byworth",
    subtitle: "Mortgage Agent · Premiere Mortgage Centre",
    templates: [],
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
    subtitle: "Erwin & Aaryon · Premiere Mortgage Centre",
    templates: [],
  },

  // Nikki Carew
  "c8118a10-7131-4df7-b77e-5c972c9d309b": {
    name: "Nikki Carew",
    subtitle: "Mortgage Broker · Premiere Mortgage Centre",
    templates: [],
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
    templates: [],
  },

  // Tracy MacIntyre
  "0ab27a09-553a-4b57-86fd-dd26dc237793": {
    name: "Tracy MacIntyre",
    subtitle: "Associate Mortgage Broker · Premiere Mortgage Centre",
    templates: [],
  },
};
