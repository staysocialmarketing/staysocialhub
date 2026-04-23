import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Users, FileText, CheckSquare, Image, Target, Lightbulb,
  LayoutDashboard, CalendarDays, Inbox, FolderKanban, Megaphone,
  Plus, Upload, Sparkles, Eye, BotMessageSquare, BadgeInfo,
  UserCircle, BookOpen, Trophy
} from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface SearchResults {
  clients: { id: string; name: string }[];
  requests: { id: string; topic: string }[];
  tasks: { id: string; title: string }[];
  media: { id: string; title: string }[];
  strategy: { client_id: string; client_name: string }[];
  thinkTank: { id: string; title: string }[];
}

const emptyResults: SearchResults = { clients: [], requests: [], tasks: [], media: [], strategy: [], thinkTank: [] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const navigate = useNavigate();
  const { isSSRole, isSSAdmin, isClientAdmin, isClientAssistant, profile } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(emptyResults); return; }
    const pattern = `%${q}%`;
    const [clients, requests, tasks, media, strategy, thinkTank] = await Promise.all([
      supabase.from("clients").select("id, name").ilike("name", pattern).limit(5),
      supabase.from("requests").select("id, topic").ilike("topic", pattern).limit(5),
      supabase.from("tasks").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("posts").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("client_strategy").select("client_id, clients!inner(name)").ilike("clients.name", pattern).limit(5),
      supabase.from("think_tank_items").select("id, title").ilike("title", pattern).limit(5),
    ]);
    setResults({
      clients: clients.data ?? [],
      requests: requests.data ?? [],
      tasks: tasks.data ?? [],
      media: media.data ?? [],
      strategy: (strategy.data ?? []).map((s: any) => ({ client_id: s.client_id, client_name: s.clients?.name ?? "" })),
      thinkTank: thinkTank.data ?? [],
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const select = (path: string) => { setOpen(false); setQuery(""); navigate(path); };
  const hasResults = Object.values(results).some((a) => a.length > 0);
  const isClient = isClientAdmin || isClientAssistant;
  const showEmpty = query.trim() && !hasResults;

  const ssNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: FolderKanban, label: "Workflow", path: "/workflow" },
    { icon: CalendarDays, label: "Content Calendar", path: "/calendar" },
    { icon: Megaphone, label: "Approvals", path: "/approvals" },
    { icon: FileText, label: "Requests", path: "/requests" },
    { icon: Inbox, label: "Inbox", path: "/team/inbox" },
    { icon: CheckSquare, label: "Tasks", path: "/team/tasks" },
    { icon: FolderKanban, label: "Projects", path: "/team/projects" },
    { icon: Lightbulb, label: "Think Tank", path: "/team/think-tank" },
    { icon: Users, label: "Clients", path: "/admin/clients" },
    { icon: Image, label: "Media", path: "/admin/media" },
    { icon: Trophy, label: "Team", path: "/admin/team" },
  ];

  const clientNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Trophy, label: "Success Center", path: "/client/success" },
    { icon: Megaphone, label: "Content Pipeline", path: "/pipeline" },
    { icon: FileText, label: "Requests", path: "/requests" },
    { icon: Image, label: "My Media", path: "/content-library" },
    { icon: UserCircle, label: "Profile", path: "/profile" },
    { icon: BookOpen, label: "Plan", path: "/plan" },
  ];

  const navItems = isSSRole ? ssNavItems : clientNavItems;

  const ssActions = [
    { icon: Plus, label: "Create Request", path: "/requests" },
    { icon: CheckSquare, label: "Create Task", path: "/team/tasks" },
    { icon: Lightbulb, label: "Capture Idea", path: "/team/think-tank" },
    { icon: Upload, label: "Upload Media", path: "/admin/media" },
    { icon: Eye, label: "View Approvals", path: "/approvals" },
    { icon: CalendarDays, label: "Open Content Calendar", path: "/calendar" },
  ];

  const clientActions = [
    { icon: Plus, label: "Create Request", path: "/requests" },
    { icon: Eye, label: "View Pipeline", path: "/pipeline" },
  ];

  const actionItems = isSSRole ? ssActions : clientActions;

  const aiActions = [
    { label: "Generate strategy…" },
    { label: "Generate draft…" },
    { label: "Summarize approvals…" },
    { label: "Create approval batch…" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors w-auto shrink-0 min-h-[44px] sm:min-h-0"
      >
        <Search className="h-4 w-4" />
        <span className="sm:inline">Search & Commands…</span>
        <kbd className="hidden sm:inline-flex ml-auto sm:ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search or type a command…" value={query} onValueChange={setQuery} />
        <CommandList>
          {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}

          {/* Search results when typing */}
          {results.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {results.clients.map((c) => (
                <CommandItem key={c.id} onSelect={() => select("/admin/clients")}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" /> {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.requests.length > 0 && (
            <CommandGroup heading="Requests">
              {results.requests.map((r) => (
                <CommandItem key={r.id} onSelect={() => select("/requests")}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> {r.topic}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {results.tasks.map((t) => (
                <CommandItem key={t.id} onSelect={() => select("/team/tasks")}>
                  <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.media.length > 0 && (
            <CommandGroup heading="Media">
              {results.media.map((m) => (
                <CommandItem key={m.id} onSelect={() => select("/admin/media")}>
                  <Image className="mr-2 h-4 w-4 text-muted-foreground" /> {m.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.strategy.length > 0 && (
            <CommandGroup heading="Strategy">
              {results.strategy.map((s) => (
                <CommandItem key={s.client_id} onSelect={() => select(`/admin/client-strategy/${s.client_id}`)}>
                  <Target className="mr-2 h-4 w-4 text-muted-foreground" /> {s.client_name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.thinkTank.length > 0 && (
            <CommandGroup heading="Think Tank">
              {results.thinkTank.map((t) => (
                <CommandItem key={t.id} onSelect={() => select("/team/think-tank")}>
                  <Lightbulb className="mr-2 h-4 w-4 text-muted-foreground" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Empty-state groups when no query */}
          {!query.trim() && (
            <>
              <CommandGroup heading="Navigate">
                {navItems.map((item) => (
                  <CommandItem key={item.path} onSelect={() => select(item.path)}>
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Actions">
                {actionItems.map((item) => (
                  <CommandItem key={item.label} onSelect={() => select(item.path)}>
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="AI Actions">
                {aiActions.map((item) => (
                  <CommandItem key={item.label} disabled className="opacity-50">
                    <BotMessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                    {item.label}
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      Coming soon
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
