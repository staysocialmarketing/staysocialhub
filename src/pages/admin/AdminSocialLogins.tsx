import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Shield,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────

interface AdminLogin {
  id: string;
  client_id: string;
  client_name: string;
  platform: string;
  username: string;
  has_password: boolean;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook:  "Facebook",
  linkedin:  "LinkedIn",
  google:    "Google",
  tiktok:    "TikTok",
  other:     "Other",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-purple-50 text-purple-700",
  facebook:  "bg-blue-50 text-blue-700",
  linkedin:  "bg-sky-50 text-sky-700",
  google:    "bg-red-50 text-red-700",
  tiktok:    "bg-gray-50 text-gray-700",
  other:     "bg-slate-50 text-slate-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function callSocialLoginsAdmin(route: string, body: unknown, token: string) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-logins/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? "Request failed");
  return data;
}

function exportCSV(logins: AdminLogin[]) {
  const rows = [
    ["Client", "Platform", "Username", "Has Password", "Last Updated"],
    ...logins.map((l) => [
      l.client_name,
      PLATFORM_LABELS[l.platform] ?? l.platform,
      l.username,
      l.has_password ? "Yes" : "No",
      formatDate(l.updated_at),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `social-logins-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Row with expand ───────────────────────────────────────────────────────

function LoginRow({ login }: { login: AdminLogin }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);

  const copyMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await callSocialLoginsAdmin("copy-password", { id: login.id }, session.access_token);
      return res.password as string;
    },
    onSuccess: async (password) => {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to copy password");
    },
  });

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{login.client_name}</td>
        <td className="px-4 py-3">
          <Badge className={`text-xs font-medium ${PLATFORM_COLORS[login.platform] ?? "bg-gray-50 text-gray-700"}`}>
            {PLATFORM_LABELS[login.platform] ?? login.platform}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
          {login.username || <span className="text-gray-400 italic font-sans">not set</span>}
        </td>
        <td className="px-4 py-3">
          {login.has_password ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Shield className="h-3.5 w-3.5" /> Stored
            </span>
          ) : (
            <span className="text-xs text-gray-400">None</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(login.updated_at)}</td>
        <td className="px-4 py-3 text-right">
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
            : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
          }
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Username</p>
                <p className="text-sm font-mono text-gray-900">
                  {login.username || <span className="text-gray-400 italic font-sans text-xs">not set</span>}
                </p>
              </div>

              {login.has_password && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyMutation.mutate();
                  }}
                  disabled={copyMutation.isPending}
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</>
                    : copyMutation.isPending
                      ? "Decrypting..."
                      : <><Copy className="h-3.5 w-3.5" /> Copy Password</>
                  }
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function AdminSocialLogins() {
  const [search,   setSearch]   = useState("");
  const [platform, setPlatform] = useState("all");
  const [filter,   setFilter]   = useState<"all" | "missing" | "complete">("all");
  const [sortField, setSortField] = useState<"client_name" | "updated_at">("updated_at");
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("desc");

  const { data: logins = [], isLoading, error } = useQuery<AdminLogin[]>({
    queryKey: ["admin-social-logins"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await callSocialLoginsAdmin("admin-list", {}, session.access_token);
      return res.logins as AdminLogin[];
    },
    refetchOnWindowFocus: false,
  });

  // Filter + search + sort
  const filtered = logins
    .filter((l) => {
      if (platform !== "all" && l.platform !== platform) return false;
      if (filter === "missing" && (l.username || l.has_password))   return false;
      if (filter === "complete" && (!l.username || !l.has_password)) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.client_name.toLowerCase().includes(q) || l.username.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "client_name") return mul * a.client_name.localeCompare(b.client_name);
      return mul * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Logins</h1>
          <p className="text-sm text-gray-500 mt-1">
            {logins.length} credential records — passwords encrypted at rest
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => exportCSV(filtered)}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV (no passwords)
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search client or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm w-56"
          />
        </div>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg p-0.5 h-9">
          <Filter className="h-3.5 w-3.5 text-gray-400 ml-1.5" />
          {(["all", "complete", "missing"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort("client_name")}
              >
                <span className="flex items-center gap-1">
                  Client <SortIcon field="client_name" />
                </span>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Platform</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Username</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Password</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort("updated_at")}
              >
                <span className="flex items-center gap-1">
                  Last Updated <SortIcon field="updated_at" />
                </span>
              </th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  Loading credentials...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-red-500 font-medium">Failed to load credentials</p>
                  <p className="text-xs text-gray-400 mt-1">{(error as Error)?.message ?? "Unknown error"}</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  No records found
                </td>
              </tr>
            ) : (
              filtered.map((login) => <LoginRow key={login.id} login={login} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
