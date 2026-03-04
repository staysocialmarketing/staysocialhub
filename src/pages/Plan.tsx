import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Plan() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["plan-detail", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase
        .from("clients")
        .select("name, status, plans(name, includes_json)")
        .eq("id", profile.client_id)
        .single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const plan = (clientData as any)?.plans;
  const includes = Array.isArray(plan?.includes_json) ? plan.includes_json : [];

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Plan</h1>
        <p className="text-sm text-muted-foreground">Details of your current package</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{plan?.name || "No plan assigned"}</CardTitle>
            <Badge variant="secondary">{(clientData as any)?.status || "active"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {includes.length > 0 ? (
            <ul className="space-y-2">
              {includes.map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No plan details available. Contact your team for more info.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-foreground">Looking for more?</p>
              <p className="text-sm text-muted-foreground">Explore add-ons and new features</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/whats-new")}>What's New</Button>
        </CardContent>
      </Card>
    </div>
  );
}
