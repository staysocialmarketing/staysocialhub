import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Brain, ListTodo, Users, Lightbulb, BookOpen } from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentDoc {
  key: string;
  title: string;
  content: string;
  updated_at: string | null;
  updated_by: string | null;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "memory",    label: "Memory",     icon: Brain },
  { key: "tasks",     label: "Tasks",      icon: ListTodo },
  { key: "clients",   label: "Clients",    icon: Users },
  { key: "decisions", label: "Decisions",  icon: BookOpen },
  { key: "think-tank",label: "Think Tank", icon: Lightbulb },
] as const;

// ── Markdown styles (prose-like, dark-theme-safe) ─────────────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-5 mb-2 border-b border-border/40 pb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-foreground/80">{children}</em>
  ),
  code: ({ children }) => (
    <code className="bg-muted/60 text-foreground text-xs rounded px-1.5 py-0.5 font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted/40 rounded-xl p-4 overflow-x-auto text-xs font-mono mb-3 border border-border/30">{children}</pre>
  ),
  hr: () => <hr className="border-border/30 my-4" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground/80 my-3">{children}</blockquote>
  ),
};

// ── Doc tab panel ─────────────────────────────────────────────────────────────

function DocPanel({ tabKey }: { tabKey: string }) {
  const { data: doc, isLoading, isError } = useQuery<AgentDoc | null>({
    queryKey: ["agent-doc", tabKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_docs")
        .select("*")
        .eq("key", tabKey)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-16 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No content yet. Lev will write here after the next session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary capitalize">
          {doc.updated_by ?? "lev"}
        </Badge>
        <span>
          Last updated{" "}
          {doc.updated_at
            ? format(new Date(doc.updated_at), "MMM d, yyyy 'at' h:mm a")
            : "—"}
        </span>
      </div>

      {/* Rendered markdown */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="px-6 py-5">
          <ReactMarkdown components={mdComponents}>{doc.content}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Workspace() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Live view of the agent team's key files — updated by Lev after each session.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="memory" className="space-y-4">
        <TabsList className="rounded-xl flex-wrap h-auto gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5 rounded-lg">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <DocPanel tabKey={key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
