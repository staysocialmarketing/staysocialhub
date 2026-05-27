import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Megaphone, Newspaper, MousePointerClick, Package, ChevronDown, FileText, Calendar, TrendingUp, Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { emailPreviewClients, type TemplateType, type EmailPreviewClient } from "@/lib/emailPreviewConfig";
import { strategyDocs, type StrategyDoc } from "@/lib/strategyDocsConfig";
import { supabase } from "@/integrations/supabase/client";

const TYPE_LABELS: Record<TemplateType, string> = {
  announcement: "Announcement",
  newsletter: "Newsletter",
  cta: "CTA Campaign",
  seasonal: "Seasonal Strategy",
  boc: "BoC Decision",
  database: "Database Mining",
};

const TYPE_COLORS: Record<TemplateType, string> = {
  announcement: "bg-blue-50 text-blue-700",
  newsletter: "bg-violet-50 text-violet-700",
  cta: "bg-amber-50 text-amber-700",
  seasonal: "bg-emerald-50 text-emerald-700",
  boc: "bg-orange-50 text-orange-700",
  database: "bg-slate-50 text-slate-700",
};

const TYPE_ICONS: Record<TemplateType, ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  newsletter: <Newspaper className="w-4 h-4" />,
  cta: <MousePointerClick className="w-4 h-4" />,
  seasonal: <Calendar className="w-4 h-4" />,
  boc: <TrendingUp className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
};

function nameMatcher(a: string, b: string) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

function TemplateGrid({ token, client }: { token: string; client: EmailPreviewClient }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {client.templates.map((template) => (
        <div
          key={template.file}
          className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[template.type]}`}>
              {TYPE_ICONS[template.type]}
              {TYPE_LABELS[template.type]}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{template.label}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
          </div>
          <a
            href={`/email-previews/${token}/${template.file}`}
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
  );
}

function StrategyDocsSection({ docs, pathToken }: { docs: StrategyDoc[]; pathToken: string }) {
  if (!docs || docs.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Strategy Documents</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.filename}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-150"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">PDF</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{doc.label}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{doc.description}</p>
            </div>
            <a
              href={`/strategy/${pathToken}/${doc.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150"
            >
              View PDF
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminView() {
  // Build unified client list: all email clients + strategy-only clients
  const emailEntries = Object.entries(emailPreviewClients);
  // Include both display name and DB name so entries like "Andrew Gad" (DB) don't
  // duplicate "AG Mortgage Team" (display name) in the strategy-only list.
  const emailDbNames = new Set(
    emailEntries.flatMap(([, c]) => [c.name.toLowerCase(), (c.clientDbName ?? c.name).toLowerCase()])
  );
  const strategyOnlyClients = strategyDocs.filter(
    (e) => !emailDbNames.has(e.clientName.toLowerCase())
  );

  type AdminEntry =
    | { type: "email"; token: string; label: string }
    | { type: "strategy"; pathToken: string; label: string };

  const allEntries: AdminEntry[] = [
    ...emailEntries.map(([token, c]) => ({ type: "email" as const, token, label: c.name })),
    ...strategyOnlyClients.map((e) => ({ type: "strategy" as const, pathToken: e.pathToken, label: e.clientName })),
  ];

  const [selected, setSelected] = useState<string>(allEntries[0]?.label ?? "");

  const emailEntry = emailEntries.find(([, c]) => c.name === selected);
  // When an email client has a different DB name (e.g. "Andrew Gad" for "AG Mortgage Team"),
  // match strategy docs by DB name so both sections appear under the same dropdown entry.
  const strategyEntry = strategyDocs.find((e) => {
    if (emailEntry) {
      const dbName = (emailEntry[1].clientDbName ?? emailEntry[1].name).toLowerCase();
      return e.clientName.toLowerCase() === dbName || e.clientName === selected;
    }
    return e.clientName === selected;
  });
  const emailClient = emailEntry ? emailEntry[1] : null;
  const emailToken = emailEntry ? emailEntry[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Client</label>
        <div className="relative max-w-xs w-full">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer"
          >
            {allEntries.map((e) => (
              <option key={e.label} value={e.label}>
                {e.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {selected && (
        <div className="space-y-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{selected}</h2>
            {emailClient?.subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{emailClient.subtitle}</p>
            )}
          </div>
          {strategyEntry && (
            <StrategyDocsSection docs={strategyEntry.docs} pathToken={strategyEntry.pathToken} />
          )}
          {emailClient && emailToken && (
            <TemplateGrid token={emailToken} client={emailClient} />
          )}
        </div>
      )}
    </div>
  );
}

function ClientView() {
  const { profile } = useAuth();

  const { data: clientName, isLoading } = useQuery({
    queryKey: ["client-name", profile?.client_id],
    enabled: !!profile?.client_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("id", profile!.client_id!)
        .single();
      return data?.name ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  const emailMatch = clientName
    ? Object.entries(emailPreviewClients).find(([, c]) =>
        nameMatcher(c.clientDbName ?? c.name, clientName)
      )
    : null;

  const strategyEntry = clientName
    ? strategyDocs.find((e) => nameMatcher(e.clientName, clientName))
    : null;

  if (!emailMatch && !strategyEntry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Package className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No deliverables yet</p>
        <p className="text-xs text-gray-400 max-w-xs">
          Your designs and templates will appear here once they're ready. Your Stay Social team will let you know.
        </p>
      </div>
    );
  }

  const [emailToken, emailClient] = emailMatch ?? [null, null];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{clientName}</h2>
        {emailClient?.subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{emailClient.subtitle}</p>
        )}
      </div>
      {strategyEntry && (
        <StrategyDocsSection docs={strategyEntry.docs} pathToken={strategyEntry.pathToken} />
      )}
      {emailClient && emailToken && (
        <TemplateGrid token={emailToken} client={emailClient} />
      )}
    </div>
  );
}

export default function ClientDeliverables() {
  const { isSSAdmin, isSSManager, isSSTeam } = useAuth();
  const isInternalUser = isSSAdmin || isSSManager || isSSTeam;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Creative Review</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deliverables</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {isInternalUser
            ? "Strategy documents, email templates, and design assets ready for client review."
            : "Your strategy documents, email templates, and design assets — ready to review and approve."}
        </p>
      </div>

      {isInternalUser ? <AdminView /> : <ClientView />}
    </div>
  );
}
