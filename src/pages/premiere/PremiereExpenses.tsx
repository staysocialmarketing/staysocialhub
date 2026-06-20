import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Upload, Trash2, Download, Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  TrendingUp, TrendingDown, DollarSign, Receipt, Building2, Loader2, Plus,
  Settings, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { parseGLExport, ParsedExpense } from "@/lib/premiere-gl-parser";
import { GeorgeChat } from "@/components/premiere/GeorgeChat";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Upload {
  id: string;
  filename: string;
  label: string | null;
  color: string | null;
  row_count: number;
  date_range_start: string;
  date_range_end: string;
  gl_account: string;
  created_at: string;
}

interface Expense {
  id: string;
  upload_id: string;
  transaction_date: string;
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

type SortField = "transaction_date" | "vendor_name" | "category" | "amount";
type SortDir = "asc" | "desc";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#C5A258", "#1e3a5f", "#6b8cba", "#e8d5a3", "#8b6914", "#2d5986",
  "#a0b4cc", "#f0e6c8", "#4a7399", "#d4aa5f",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Software & Tools": "#C5A258",
  "Advertising": "#1e3a5f",
  "Creative Services": "#6b8cba",
  "Domains & Hosting": "#e8d5a3",
  "Chargebacks & Credits": "#8b6914",
  "Other": "#94a3b8",
};

const TAB_COLORS = ["#C5A258", "#1e3a5f", "#6b8cba", "#8b6914", "#4a7399", "#2d5986"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(dateStr: string) {
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

function exportCSV(expenses: Expense[]) {
  const headers = ["Date", "Vendor", "Description", "Category", "Amount", "Payment Method", "Ref #", "GL Account"];
  const rows = expenses.map(e => [
    e.transaction_date,
    e.vendor_name,
    `"${e.description.replace(/"/g, '""')}"`,
    e.category,
    e.amount.toFixed(2),
    e.payment_method,
    e.ref_number,
    e.gl_account,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `premiere-expenses-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title, value, sub, icon: Icon, trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: { pct: number; label: string };
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.pct > 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-red-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-green-400" />}
                <span className={`text-xs font-medium ${trend.pct > 0 ? "text-red-400" : "text-green-400"}`}>
                  {Math.abs(trend.pct).toFixed(1)}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#C5A258]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[#C5A258]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, label: string) => void;
  uploading: boolean;
  existingLabels: string[];
}

function UploadModal({ open, onClose, onUpload, uploading, existingLabels }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, "").replace(/_/g, " "));
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, label.trim() || file.name.replace(/\.[^.]+$/, ""));
  };

  // Reset on close
  const handleClose = () => {
    setFile(null);
    setLabel("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload GL Export</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              dragging ? "border-[#C5A258] bg-[#C5A258]/5" : "border-border/60 hover:border-[#C5A258]/50 hover:bg-muted/30",
              file && "border-green-500/50 bg-green-500/5"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <Check className="h-7 w-7 text-green-500" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm font-medium">Drop QuickBooks GL export</p>
                <p className="text-xs text-muted-foreground">.xlsx or .csv</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-label">Group name</Label>
            <Input
              id="group-label"
              placeholder="e.g. Advertising - Digital"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            {existingLabels.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Existing groups: {existingLabels.join(", ")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="bg-[#1e3a5f] hover:bg-[#2d5986] text-white gap-2"
          >
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  uploads: Upload[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddUpload: () => void;
  onDeleteUpload: (id: string) => void;
}

function TabBar({ uploads, activeTab, onTabChange, onAddUpload, onDeleteUpload }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-border/60 pb-0">
      {/* All tab */}
      <button
        onClick={() => onTabChange("all")}
        className={cn(
          "relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border border-transparent",
          activeTab === "all"
            ? "bg-card border-border/60 border-b-card text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        All
      </button>

      {[...uploads].sort((a, b) => (a.label || a.filename).localeCompare(b.label || b.filename)).map((u, i) => {
        const color = u.color || TAB_COLORS[i % TAB_COLORS.length];
        const label = u.label || u.gl_account || u.filename;
        const isActive = activeTab === u.id;

        return (
          <div key={u.id} className="relative group">
            <button
              onClick={() => onTabChange(u.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border border-transparent flex items-center gap-2",
                isActive
                  ? "bg-card border-border/60 border-b-card text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="max-w-[120px] truncate">{label}</span>
            </button>
            {/* Delete on hover */}
            <button
              onClick={e => { e.stopPropagation(); onDeleteUpload(u.id); }}
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 rounded-full bg-destructive/80 text-white items-center justify-center z-10"
              title="Delete this upload"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}

      {/* Add upload button */}
      <button
        onClick={onAddUpload}
        className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-t-lg hover:bg-muted/30"
      >
        <Plus className="h-3.5 w-3.5" />
        Upload
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PremiereExpenses() {
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Table
  const [sortField, setSortField] = useState<SortField>("transaction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: uploads = [], isLoading: uploadsLoading } = useQuery({
    queryKey: ["premiere-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premiere_uploads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Upload[];
    },
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["premiere-expenses", activeTab],
    queryFn: async () => {
      let q = supabase.from("premiere_expenses").select("*").order("transaction_date", { ascending: false });
      if (activeTab !== "all") q = q.eq("upload_id", activeTab);
      const { data, error } = await q;
      if (error) throw error;
      return data as Expense[];
    },
  });

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUpload = useCallback(async (file: File, label: string) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = xlsxRead(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });

      const result = parseGLExport(rows);

      if (result.expenses.length === 0) {
        toast.error("No valid expense rows found. Check the file format.");
        return;
      }

      // Determine color based on current upload count
      const color = TAB_COLORS[uploads.length % TAB_COLORS.length];

      const { data: uploadRow, error: uploadError } = await supabase
        .from("premiere_uploads")
        .insert({
          filename: file.name,
          label: label || result.gl_account || file.name,
          color,
          row_count: result.expenses.length,
          date_range_start: result.date_range_start || null,
          date_range_end: result.date_range_end || null,
          gl_account: result.gl_account || null,
        })
        .select()
        .single();

      if (uploadError || !uploadRow) throw uploadError ?? new Error("Upload insert failed");

      // Batch insert expenses
      for (let i = 0; i < result.expenses.length; i += 200) {
        const batch = result.expenses.slice(i, i + 200);
        const { error } = await supabase.from("premiere_expenses").insert(
          batch.map(e => ({
            upload_id: uploadRow.id,
            transaction_date: e.transaction_date,
            transaction_type: e.transaction_type,
            ref_number: e.ref_number,
            vendor_name: e.vendor_name,
            description: e.description,
            gl_account: e.gl_account,
            payment_method: e.payment_method,
            amount: e.amount,
            balance: e.balance,
            category: e.category,
            auto_categorized: e.auto_categorized,
          }))
        );
        if (error) throw error;
      }

      toast.success(`Uploaded ${result.expenses.length} transactions`);
      queryClient.invalidateQueries({ queryKey: ["premiere-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["premiere-expenses"] });
      setActiveTab(uploadRow.id);
      setUploadModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Check the file format.");
    } finally {
      setUploading(false);
    }
  }, [queryClient, uploads.length]);

  // ── Delete mutation ───────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      const { error } = await supabase.from("premiere_uploads").delete().eq("id", uploadId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Upload deleted");
      setActiveTab("all");
      queryClient.invalidateQueries({ queryKey: ["premiere-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["premiere-expenses"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const categories = Array.from(new Set(expenses.map(e => e.category))).sort();

  const filtered = expenses.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.vendor_name.toLowerCase().includes(q) &&
        !e.description.toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q) &&
        !e.ref_number.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom && e.transaction_date < dateFrom) return false;
    if (dateTo && e.transaction_date > dateTo) return false;
    if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "amount") cmp = a.amount - b.amount;
    else cmp = String(a[sortField]).localeCompare(String(b[sortField]));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalSpend = filtered.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);
  const txnCount = filtered.length;

  const vendorTotals = filtered.reduce<Record<string, number>>((acc, e) => {
    if (e.amount > 0) acc[e.vendor_name] = (acc[e.vendor_name] || 0) + e.amount;
    return acc;
  }, {});
  const topVendor = Object.entries(vendorTotals).sort(([, a], [, b]) => b - a)[0];

  // Monthly trend data (stacked by upload group on "all" tab)
  const monthlyData = (() => {
    if (activeTab !== "all" || uploads.length <= 1) {
      // Simple single-series
      const byMonth: Record<string, number> = {};
      for (const e of filtered) {
        if (e.amount <= 0) continue;
        const month = e.transaction_date.slice(0, 7);
        byMonth[month] = (byMonth[month] || 0) + e.amount;
      }
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({
          month: format(parseISO(`${month}-01`), "MMM yy"),
          total: Math.round(total),
        }));
    }
    // Stacked by upload
    const byMonthGroup: Record<string, Record<string, number>> = {};
    for (const e of filtered) {
      if (e.amount <= 0) continue;
      const month = e.transaction_date.slice(0, 7);
      const uploadLabel = uploads.find(u => u.id === e.upload_id)?.label || "Other";
      if (!byMonthGroup[month]) byMonthGroup[month] = {};
      byMonthGroup[month][uploadLabel] = (byMonthGroup[month][uploadLabel] || 0) + e.amount;
    }
    return Object.entries(byMonthGroup)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, groups]) => ({
        month: format(parseISO(`${month}-01`), "MMM yy"),
        ...Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, Math.round(v)])),
        total: Object.values(groups).reduce((s, v) => s + v, 0),
      }));
  })();

  const trendData = monthlyData;

  // MoM change
  let momTrend: { pct: number; label: string } | undefined;
  if (trendData.length >= 2) {
    const prev = trendData[trendData.length - 2].total;
    const curr = trendData[trendData.length - 1].total;
    const pct = prev ? ((curr - prev) / prev) * 100 : 0;
    momTrend = { pct, label: "vs last month" };
  }

  // Vendor donut
  const vendorDonutData = Object.entries(vendorTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // Upload group keys for stacked bar
  const uploadGroupKeys = activeTab === "all"
    ? [...uploads].sort((a, b) => (a.label || "").localeCompare(b.label || "")).map(u => u.label || u.filename)
    : [];

  // ── Sort helpers ──────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-[#C5A258]" />
      : <ChevronDown className="h-3.5 w-3.5 text-[#C5A258]" />;
  };

  const hasData = expenses.length > 0;
  const existingLabels = uploads.map(u => u.label || u.gl_account || u.filename).filter(Boolean);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-2 w-2 rounded-full bg-[#C5A258]" />
            <span className="text-xs font-semibold text-[#C5A258] uppercase tracking-widest">Premiere Mortgage Centre</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Expense Dashboard</h1>
        </div>
        {hasData && (
          <Button variant="outline" size="sm" onClick={() => exportCSV(sorted)} className="shrink-0 gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Tab bar */}
      {(uploads.length > 0 || !uploadsLoading) && (
        <TabBar
          uploads={uploads}
          activeTab={activeTab}
          onTabChange={(id) => { setActiveTab(id); setSearch(""); setDateFrom(""); setDateTo(""); setSelectedCategory("all"); }}
          onAddUpload={() => setUploadModalOpen(true)}
          onDeleteUpload={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* Upload modal */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
        existingLabels={existingLabels}
      />

      {/* Empty state — no uploads yet */}
      {!hasData && !expensesLoading && !uploadsLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#C5A258]/10 flex items-center justify-center">
            <Upload className="h-7 w-7 text-[#C5A258]/60" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Upload a GL export to get started</p>
            <p className="text-sm text-muted-foreground mt-1">Drop a QuickBooks GL detail report (.xlsx or .csv)</p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)} className="gap-2 bg-[#1e3a5f] hover:bg-[#2d5986] text-white">
            <Upload className="h-4 w-4" /> Upload GL Export
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      {hasData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Spend"
            value={fmtCurrency(totalSpend)}
            sub={filtered.length !== expenses.length ? `filtered from ${fmtCurrency(expenses.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0))}` : undefined}
            icon={DollarSign}
          />
          <SummaryCard
            title="Transactions"
            value={txnCount.toString()}
            sub="matching current filters"
            icon={Receipt}
          />
          <SummaryCard
            title="Top Vendor"
            value={topVendor ? topVendor[0] : "—"}
            sub={topVendor ? fmtCurrency(topVendor[1]) : undefined}
            icon={Building2}
          />
          <SummaryCard
            title="MoM Change"
            value={momTrend ? `${momTrend.pct > 0 ? "+" : ""}${momTrend.pct.toFixed(1)}%` : "—"}
            sub={trendData.length >= 2 ? `${trendData[trendData.length - 1].month} vs ${trendData[trendData.length - 2].month}` : "Need 2+ months"}
            icon={momTrend && momTrend.pct > 0 ? TrendingUp : TrendingDown}
            trend={momTrend}
          />
        </div>
      )}

      {/* Charts */}
      {hasData && trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Monthly Trend */}
          <Card className="lg:col-span-3 border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Monthly Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtCurrency(v), name === "total" ? "Spend" : name]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  {uploadGroupKeys.length > 1
                    ? uploadGroupKeys.map((key, i) => (
                        <Bar key={key} dataKey={key} stackId="a" fill={TAB_COLORS[i % TAB_COLORS.length]} radius={i === uploadGroupKeys.length - 1 ? [4, 4, 0, 0] : undefined} maxBarSize={48} />
                      ))
                    : <Bar dataKey="total" fill="#C5A258" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  }
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendor Donut */}
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Vendor Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={vendorDonutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {vendorDonutData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtCurrency(v), "Spend"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} formatter={(value: string) => <span className="text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {hasData && (
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search vendor, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm w-auto" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm w-auto" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-sm w-auto min-w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || dateFrom || dateTo || selectedCategory !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setSelectedCategory("all"); }} className="h-9 gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Transaction Table */}
      {hasData && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Transactions
              <span className="ml-2 text-xs font-normal text-muted-foreground">{sorted.length} of {expenses.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expensesLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No transactions match your filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      {([
                        { field: "transaction_date", label: "Date" },
                        { field: "vendor_name", label: "Vendor" },
                        { field: "category", label: "Category" },
                        { field: "amount", label: "Amount" },
                      ] as { field: SortField; label: string }[]).map(({ field, label }) => (
                        <th key={field} onClick={() => handleSort(field)} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                          <div className="flex items-center gap-1">{label} <SortIcon field={field} /></div>
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((e, i) => (
                      <tr key={e.id} className={cn("border-b border-border/30 hover:bg-muted/20 transition-colors", i % 2 !== 0 && "bg-muted/5")}>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.transaction_date)}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[160px]">
                          <span className="block truncate">{e.vendor_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px] font-medium whitespace-nowrap" style={{ background: `${CATEGORY_COLORS[e.category] || "#94a3b8"}18`, color: CATEGORY_COLORS[e.category] || "#94a3b8", border: `1px solid ${CATEGORY_COLORS[e.category] || "#94a3b8"}30` }}>
                            {e.category}
                          </Badge>
                        </td>
                        <td className={cn("px-4 py-3 font-semibold tabular-nums whitespace-nowrap", e.amount < 0 ? "text-green-500" : "text-foreground")}>
                          {e.amount < 0 ? "−" : ""}{fmtCurrency(Math.abs(e.amount))}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                          <span className="block truncate" title={e.description}>{e.description || "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* George AI Chat — always mounted, floating */}
      <GeorgeChat uploadId={activeTab !== "all" ? activeTab : undefined} />
    </div>
  );
}
