import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Brain, User, MessageSquare, Users, ShoppingBag, FileText } from "lucide-react";

const SECTIONS = [
  { key: "brand_basics_json", label: "Brand Basics", icon: User },
  { key: "brand_voice_json", label: "Brand Voice", icon: MessageSquare },
  { key: "audience_json", label: "Audience", icon: Users },
  { key: "offers_json", label: "Offers & Services", icon: ShoppingBag },
  { key: "content_rules_json", label: "Content Rules", icon: FileText },
] as const;

function renderValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === "") return <span className="text-muted-foreground/50 italic">—</span>;
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-muted-foreground/50 italic">—</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {val.map((v, i) => <li key={i} className="text-sm">{typeof v === "object" ? JSON.stringify(v) : String(v)}</li>)}
      </ul>
    );
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) return <span className="text-muted-foreground/50 italic">—</span>;
    return (
      <dl className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
            <dd className="text-sm mt-0.5">{renderValue(v)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return String(val);
}

export default function BrandTwin() {
  const { profile } = useAuth();
  const clientId = profile?.client_id;

  const { data, isLoading } = useQuery({
    queryKey: ["brand-twin-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_twin")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="p-6">
        <EmptyState icon={<Brain className="h-10 w-10" />} title="No client linked" description="Your account isn't linked to a client yet." />
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <EmptyState icon={<Brain className="h-10 w-10" />} title="No Brand Twin yet" description="Complete an AI Interview to start building your Brand Twin profile." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Brand Twin</h1>
        <p className="text-sm text-muted-foreground">Your AI-powered brand profile built from interviews and research.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const sectionData = (data as any)[key];
          const isEmpty = !sectionData || (typeof sectionData === "object" && Object.keys(sectionData).length === 0);
          return (
            <Card key={key} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{label}</h2>
              </div>
              {isEmpty ? (
                <p className="text-xs text-muted-foreground/50 italic">Not yet populated</p>
              ) : (
                <div className="text-sm">{renderValue(sectionData)}</div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
