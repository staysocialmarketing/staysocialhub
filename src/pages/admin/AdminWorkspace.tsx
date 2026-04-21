import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Briefcase,
  Search,
  FileText,
  AlertCircle,
  Trophy,
  Bot,
  Link2,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  ExternalLink,
  Github,
  Database,
  Globe,
  Zap,
  Terminal,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
  updated_by: string;
}

interface OpenItem {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamWin {
  id: string;
  title: string;
  description: string | null;
  category: string;
  agent: string | null;
  created_at: string;
}

interface AgentUpdate {
  id: string;
  agent_name: string;
  task_summary: string;
  output_location: string | null;
  status: string;
  created_at: string;
}

interface AgentMorale {
  id: string;
  agent_name: string;
  week_of: string;
  most_engaging: string | null;
  least_engaging: string | null;
  missing_context: string | null;
  suggestions: string | null;
  lev_summary: string | null;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
  in_progress_agent: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const WIN_CATEGORY_STYLES: Record<string, string> = {
  client: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  product: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  team: "bg-green-500/10 text-green-500 border-green-500/20",
  revenue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  general: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const DOC_CATEGORY_STYLES: Record<string, string> = {
  memory: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  client: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  decision: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  agent: "bg-green-500/10 text-green-500 border-green-500/20",
  general: "bg-muted text-muted-foreground border-border",
};

const AGENTS = [
  { name: "lev", role: "Chief of Staff" },
  { name: "scout", role: "Research" },
  { name: "quill", role: "Copywriter" },
  { name: "ember", role: "Creative" },
  { name: "forge", role: "Developer" },
  { name: "pixel", role: "Designer" },
];

const QUICK_LINKS = [
  { label: "GitHub", url: "https://github.com/staysocialmarketing/staysocialhub", icon: Github, description: "staysocialhub repo" },
  { label: "Supabase", url: "https://supabase.com/dashboard/project/ktyjtbivycjkklkrcudb", icon: Database, description: "Project dashboard" },
  { label: "Vercel", url: "https://vercel.com", icon: Zap, description: "Deployments" },
  { label: "GoHighLevel", url: "https://app.gohighlevel.com", icon: Globe, description: "CRM & Automation" },
  { label: "Anthropic Console", url: "https://console.anthropic.com", icon: Terminal, description: "AI usage & keys" },
  { label: "ElevenLabs", url: "https://elevenlabs.io", icon: Bot, description: "Voice AI" },
  { label: "HUB Live", url: "https://hub.staysocial.ca", icon: Globe, description: "hub.staysocial.ca" },
  { label: "staysocial.ca", url: "https://staysocial.ca", icon: Globe, description: "Agency website" },
];

// ── Section 1: Live Documents ─────────────────────────────────────────────────

function LiveDocuments() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery<WorkspaceDoc[]>({
    queryKey: ["workspace-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_docs" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, WorkspaceDoc[]>>((acc, doc) => {
    const cat = doc.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents…
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "No documents match your search." : "No documents yet. Lev will write here."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryDocs]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] capitalize ${DOC_CATEGORY_STYLES[category] || DOC_CATEGORY_STYLES.general}`}>
                  {category}
                </Badge>
              </h3>
              <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/30">
                {categoryDocs.map((doc) => (
                  <div key={doc.id} className="group">
                    <button
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Updated {format(new Date(doc.updated_at), "MMM d, yyyy 'at' h:mm a")} · by {doc.updated_by}
                        </p>
                      </div>
                      {expandedId === doc.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                      )}
                    </button>
                    {expandedId === doc.id && (
                      <div className="px-5 pb-5">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 leading-relaxed font-mono overflow-auto max-h-96">
                          {doc.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section 2: Open Items ─────────────────────────────────────────────────────

function OpenItems() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assigned_to: "" });

  const { data: items = [], isLoading } = useQuery<OpenItem[]>({
    queryKey: ["open-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("open_items" as any)
        .select("*")
        .neq("status", "resolved")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      // Sort: high → medium → low
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (data || []).sort(
        (a: any, b: any) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
      );
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("open_items" as any).insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        assigned_to: form.assigned_to.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-items"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", priority: "medium", assigned_to: "" });
      toast({ title: "Item added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("open_items" as any)
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-items"] });
      toast({ title: "Marked resolved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Priority-sorted open action items.</p>
        {isSSAdmin && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No open items. You're clear.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/30">
          {items.map((item) => (
            <div key={item.id} className="px-5 py-4 flex items-start gap-4 group hover:bg-muted/10 transition-colors">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[item.priority] || ""}`}>
                    {item.priority}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.assigned_to && <span>→ {item.assigned_to}</span>}
                  <span>{format(new Date(item.updated_at), "MMM d")}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[item.status] || ""}`}>
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              {isSSAdmin && item.status !== "resolved" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-1"
                  onClick={() => resolveMutation.mutate(item.id)}
                  disabled={resolveMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Open Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="What needs attention?"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="More context..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign To <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Lev, Forge"
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!form.title.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Section 3: Win Log ────────────────────────────────────────────────────────

function WinLog() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general", agent: "" });

  const { data: wins = [], isLoading } = useQuery<TeamWin[]>({
    queryKey: ["workspace-wins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_wins" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_wins" as any).insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        agent: form.agent.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-wins"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", category: "general", agent: "" });
      toast({ title: "Win logged!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Celebrating what's working.</p>
        {isSSAdmin && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Log Win
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : wins.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No wins logged yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wins.map((win) => (
            <div
              key={win.id}
              className="rounded-2xl bg-card border border-border/50 px-5 py-4 flex items-start gap-4 hover:border-primary/20 transition-colors"
            >
              <div className="mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{win.title}</span>
                  <Badge variant="outline" className={`text-[10px] capitalize ${WIN_CATEGORY_STYLES[win.category] || WIN_CATEGORY_STYLES.general}`}>
                    {win.category}
                  </Badge>
                </div>
                {win.description && <p className="text-xs text-muted-foreground">{win.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {win.agent && <span>Credit: {win.agent}</span>}
                  <span>{format(new Date(win.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Log a Win
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>What happened?</Label>
              <Input
                placeholder="e.g. Craig's LinkedIn campaign hit 10k impressions"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Details <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="More context..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Credit <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Quill, Forge"
                  value={form.agent}
                  onChange={(e) => setForm((f) => ({ ...f, agent: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!form.title.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Log Win"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Section 4: Agent Workspace ────────────────────────────────────────────────

function AgentWorkspace() {
  const [expandedMorale, setExpandedMorale] = useState<string | null>(null);

  const { data: updates = [], isLoading: loadingUpdates } = useQuery<AgentUpdate[]>({
    queryKey: ["agent-updates-workspace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_updates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: morale = [], isLoading: loadingMorale } = useQuery<AgentMorale[]>({
    queryKey: ["agent-morale-workspace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_morale" as any)
        .select("*")
        .order("week_of", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingUpdates || loadingMorale;

  // Get most recent update per agent
  const latestUpdateByAgent = AGENTS.reduce<Record<string, AgentUpdate | undefined>>((acc, agent) => {
    acc[agent.name] = updates.find((u) => u.agent_name === agent.name);
    return acc;
  }, {});

  // Get most recent morale per agent
  const latestMoraleByAgent = AGENTS.reduce<Record<string, AgentMorale | undefined>>((acc, agent) => {
    acc[agent.name] = morale.find((m) => m.agent_name === agent.name);
    return acc;
  }, {});

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "in_progress": return <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" />;
      case "blocked": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Live view of each agent's last task and morale check-in.</p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {AGENTS.map((agent) => {
            const update = latestUpdateByAgent[agent.name];
            const moraleEntry = latestMoraleByAgent[agent.name];
            const moraleKey = `${agent.name}-morale`;
            const isMoraleExpanded = expandedMorale === moraleKey;

            return (
              <Card key={agent.name} className="rounded-2xl border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold capitalize">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{agent.role}</p>
                    </div>
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {update ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(update.status)}
                        <span className="text-xs text-muted-foreground">Last task</span>
                        <Badge variant="outline" className={`text-[10px] ml-auto ${STATUS_STYLES[update.status] || ""}`}>
                          {update.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{update.task_summary}</p>
                      {update.output_location && (
                        <a
                          href={update.output_location.startsWith("http") ? update.output_location : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Link2 className="h-3 w-3" />
                          {update.output_location.startsWith("http") ? "View output" : update.output_location}
                          {update.output_location.startsWith("http") && <ExternalLink className="h-3 w-3" />}
                        </a>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No tasks recorded yet.</p>
                  )}

                  {moraleEntry && (
                    <div className="border-t border-border/30 pt-3">
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                        onClick={() => setExpandedMorale(isMoraleExpanded ? null : moraleKey)}
                      >
                        <span className="flex-1 text-left font-medium">
                          Morale · w/o {moraleEntry.week_of}
                        </span>
                        {isMoraleExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {isMoraleExpanded && (
                        <div className="mt-2 space-y-2">
                          {moraleEntry.lev_summary && (
                            <p className="text-xs text-foreground italic bg-muted/30 rounded-lg p-2">
                              "{moraleEntry.lev_summary}"
                            </p>
                          )}
                          {moraleEntry.most_engaging && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-green-500">Most engaging</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{moraleEntry.most_engaging}</p>
                            </div>
                          )}
                          {moraleEntry.least_engaging && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-500">Least engaging</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{moraleEntry.least_engaging}</p>
                            </div>
                          )}
                          {moraleEntry.suggestions && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{moraleEntry.suggestions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section 5: Quick Links ────────────────────────────────────────────────────

function QuickLinks() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {QUICK_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl bg-card border border-border/50 px-4 py-4 flex flex-col gap-2 hover:border-primary/30 hover:bg-muted/10 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <link.icon className="h-4 w-4 text-primary" />
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{link.label}</p>
            <p className="text-xs text-muted-foreground truncate">{link.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminWorkspace() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">Live view of docs, open items, wins, and the team.</p>
        </div>
      </div>

      <Tabs defaultValue="docs" className="space-y-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="docs" className="gap-1.5 rounded-lg">
            <FileText className="h-3.5 w-3.5" /> Docs
          </TabsTrigger>
          <TabsTrigger value="open-items" className="gap-1.5 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5" /> Open Items
          </TabsTrigger>
          <TabsTrigger value="wins" className="gap-1.5 rounded-lg">
            <Trophy className="h-3.5 w-3.5" /> Wins
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 rounded-lg">
            <Bot className="h-3.5 w-3.5" /> Agents
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 rounded-lg">
            <Link2 className="h-3.5 w-3.5" /> Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <LiveDocuments />
        </TabsContent>

        <TabsContent value="open-items">
          <OpenItems />
        </TabsContent>

        <TabsContent value="wins">
          <WinLog />
        </TabsContent>

        <TabsContent value="agents">
          <AgentWorkspace />
        </TabsContent>

        <TabsContent value="links">
          <QuickLinks />
        </TabsContent>
      </Tabs>
    </div>
  );
}
