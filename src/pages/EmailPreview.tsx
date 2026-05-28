import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { emailPreviewClients, TemplateType } from "@/lib/emailPreviewConfig";
import { ExternalLink, Megaphone, Newspaper, MousePointerClick, Calendar, TrendingUp, Database, Mail } from "lucide-react";

const TYPE_LABELS: Record<TemplateType, string> = {
  announcement: "Announcement",
  newsletter: "Newsletter",
  cta: "CTA Campaign",
  seasonal: "Seasonal Strategy",
  boc: "BoC Decision",
  database: "Database Mining",
  campaign: "Campaign Email",
};

const TYPE_COLORS: Record<TemplateType, string> = {
  announcement: "bg-blue-50 text-blue-700",
  newsletter: "bg-violet-50 text-violet-700",
  cta: "bg-amber-50 text-amber-700",
  seasonal: "bg-emerald-50 text-emerald-700",
  boc: "bg-orange-50 text-orange-700",
  database: "bg-slate-50 text-slate-700",
  campaign: "bg-rose-50 text-rose-700",
};

const TYPE_ICONS: Record<TemplateType, ReactNode> = {
  announcement: <Megaphone className="w-5 h-5" />,
  newsletter: <Newspaper className="w-5 h-5" />,
  cta: <MousePointerClick className="w-5 h-5" />,
  seasonal: <Calendar className="w-5 h-5" />,
  boc: <TrendingUp className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
  campaign: <Mail className="w-5 h-5" />,
};

export default function EmailPreview() {
  const { clientToken } = useParams<{ clientToken: string }>();
  const client = clientToken ? emailPreviewClients[clientToken] : null;

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl font-bold text-gray-900 mb-2">404</p>
          <p className="text-lg font-medium text-gray-700 mb-1">Page not found</p>
          <p className="text-sm text-gray-400">
            This preview link is invalid or has expired. Contact your Stay Social team for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg tracking-tight">Stay Social</span>
            <span className="text-gray-600 text-lg select-none">/</span>
            <span className="text-gray-300 text-sm font-medium">Email Templates</span>
          </div>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">Preview</span>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ready for review</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{client.name}</h1>
          {client.subtitle && (
            <p className="text-base text-gray-500">{client.subtitle}</p>
          )}
          <p className="mt-4 text-sm text-gray-500 max-w-lg leading-relaxed">
            Your email templates are ready. Click <span className="font-medium text-gray-700">View Template</span> on any card to open the full design in your browser. Let us know which direction you prefer.
          </p>
        </div>
      </div>

      {/* Template grid */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {client.templates.map((template) => (
            <div
              key={template.file}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-150"
            >
              {/* Type badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[template.type]}`}>
                  {TYPE_ICONS[template.type]}
                  {TYPE_LABELS[template.type]}
                </span>
              </div>

              {/* Label + description */}
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{template.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
              </div>

              {/* CTA */}
              <a
                href={`/email-previews/${clientToken}/${template.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150"
              >
                View Template
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 pb-12 mt-2">
        <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            Built by <span className="font-medium text-gray-600">Stay Social</span> · These templates are for review only and contain placeholder copy.
          </p>
          <a
            href="https://staysocial.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            staysocial.ca
          </a>
        </div>
      </footer>

    </div>
  );
}
