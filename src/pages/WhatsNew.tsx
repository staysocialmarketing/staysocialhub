import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const addons = [
  { title: "Email Marketing", desc: "Monthly email campaigns to nurture your audience and drive conversions.", icon: "📧", price: "From $299/mo" },
  { title: "Reels & Short-Form Video", desc: "Engaging vertical video content for Instagram Reels, TikTok, and Shorts.", icon: "🎬", price: "From $499/mo" },
  { title: "Paid Social Ads", desc: "Strategic ad campaigns with targeting, creative, and reporting.", icon: "📊", price: "From $599/mo" },
  { title: "Blog & SEO Content", desc: "Monthly blog posts optimized for search to drive organic traffic.", icon: "✍️", price: "From $399/mo" },
  { title: "Photography Sessions", desc: "Professional brand photography for your social content library.", icon: "📷", price: "From $799/session" },
  { title: "Community Management", desc: "Active engagement with your audience — comments, DMs, and more.", icon: "💬", price: "From $349/mo" },
];

export default function WhatsNew() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [requestedAddons, setRequestedAddons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.client_id) return;
    supabase
      .from("addon_requests")
      .select("addon_name")
      .eq("client_id", profile.client_id)
      .then(({ data }) => {
        if (data) setRequestedAddons(new Set(data.map((r) => r.addon_name)));
      });
  }, [profile?.client_id]);

  const handleRequest = async (addonName: string) => {
    if (!profile?.client_id || !user?.id) return;
    setLoading(addonName);
    const { error } = await supabase.from("addon_requests").insert({
      client_id: profile.client_id,
      user_id: user.id,
      addon_name: addonName,
    });
    setLoading(null);
    if (error) {
      toast({ title: "Error", description: "Could not submit request. Please try again.", variant: "destructive" });
    } else {
      setRequestedAddons((prev) => new Set(prev).add(addonName));
      toast({ title: "Request Sent!", description: `We'll be in touch about ${addonName}.` });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-bold text-foreground">What's New / Add-ons</h2>
      </div>
      <p className="text-muted-foreground">Supercharge your social presence with these add-on services.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map((a) => {
          const requested = requestedAddons.has(a.title);
          const isLoading = loading === a.title;
          return (
            <Card key={a.title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 space-y-3">
                <span className="text-3xl">{a.icon}</span>
                <h3 className="font-semibold text-foreground">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
                <p className="text-sm font-medium text-primary">{a.price}</p>
                <Button
                  variant={requested ? "secondary" : "default"}
                  size="sm"
                  disabled={requested || isLoading}
                  onClick={() => handleRequest(a.title)}
                >
                  {isLoading ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
                  ) : requested ? (
                    <><Check className="h-3 w-3" /> Requested</>
                  ) : (
                    "Request Package"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
