export type TemplateType = "announcement" | "newsletter" | "cta";

export interface EmailTemplate {
  label: string;
  description: string;
  file: string;
  type: TemplateType;
}

export interface EmailPreviewClient {
  name: string;
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

  // AG Mortgage Team
  "11cc8a9c-abb1-4e27-b24d-dc573bdfa449": {
    name: "AG Mortgage Team",
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
};
