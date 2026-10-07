import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * One page, several of the old pages as tabs (?tab=). Used by the Clients, Team and Admin
 * hubs so the internal menu stays as short as the client one. Inactive tabs are unmounted.
 */
export type HubTab = { key: string; label: string; element: React.ReactNode; show?: boolean };

export function HubTabs({ title, lead, tabs }: { title: string; lead: string; tabs: HubTab[] }) {
  const [params, setParams] = useSearchParams();
  const visible = tabs.filter((t) => t.show !== false);
  const raw = params.get("tab");
  const tab = visible.some((t) => t.key === raw) ? (raw as string) : visible[0]?.key;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", v); return n; })}>
        <TabsList className={cn("flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1")}>
          {visible.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {visible.map((t) => (
          <TabsContent key={t.key} value={t.key} className="-mx-4 sm:-mx-6">{t.element}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
