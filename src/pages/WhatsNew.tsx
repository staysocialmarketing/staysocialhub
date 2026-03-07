import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  price: string | null;
  created_at: string;
}

export default function WhatsNew() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [recommendedItemId, setRecommendedItemId] = useState<string | null>(null);
  const [visibleAddonIds, setVisibleAddonIds] = useState<string[]>([]);
  const [requestedAddons, setRequestedAddons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.client_id) return;

    // Fetch client data for recommended_item_id and visible addons
    supabase.from("clients").select("recommended_item_id, whats_new_visible_addons").eq("id", profile.client_id).single().then(({ data }) => {
      if (data) {
        setRecommendedItemId((data as any).recommended_item_id);
        const addons = (data as any).whats_new_visible_addons;
        if (Array.isArray(addons) && addons.length > 0) {
          setVisibleAddonIds(addons as string[]);
        } else {
          setVisibleAddonIds([]);
        }
      }
    });

    // Fetch marketplace items
    supabase.from("marketplace_items").select("*").eq("is_active", true).order("sort_order").order("created_at", { ascending: false }).then(({ data }) => {
      setItems((data as MarketplaceItem[]) || []);
    });

    // Fetch existing requests
    supabase.from("addon_requests").select("addon_name").eq("client_id", profile.client_id).then(({ data }) => {
      if (data) setRequestedAddons(new Set(data.map((r) => r.addon_name)));
    });
  }, [profile?.client_id]);

  const handleRequest = async (itemName: string) => {
    if (!profile?.client_id || !user?.id) return;
    setLoading(itemName);
    const { error } = await supabase.from("addon_requests").insert({
      client_id: profile.client_id,
      user_id: user.id,
      addon_name: itemName,
    });
    setLoading(null);
    if (error) {
      toast({ title: "Error", description: "Could not submit request. Please try again.", variant: "destructive" });
    } else {
      setRequestedAddons((prev) => new Set(prev).add(itemName));
      toast({ title: "Request Sent!", description: `We'll be in touch about ${itemName}.` });
    }
  };

  const filteredItems = visibleAddonIds.length > 0
    ? items.filter((i) => visibleAddonIds.includes(i.id))
    : items;

  const solutions = filteredItems.filter((i) => i.category === "solution");
  const upgrades = filteredItems.filter((i) => i.category === "upgrade");

  // Determine recommended item: admin-chosen or most recent
  const recommendedItem = recommendedItemId
    ? filteredItems.find((i) => i.id === recommendedItemId)
    : filteredItems[0] || null;

  const renderCard = (item: MarketplaceItem, isRecommended = false) => {
    const requested = requestedAddons.has(item.name);
    const isLoading = loading === item.name;
    return (
      <Card key={item.id} className={`hover:shadow-md transition-shadow ${isRecommended ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-3xl">{item.icon || "📦"}</span>
            {isRecommended && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                <Star className="h-3 w-3 mr-0.5" /> Recommended
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground">{item.name}</h3>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          {item.price && <p className="text-sm font-medium text-primary">{item.price}</p>}
          <Button
            variant={requested ? "secondary" : "default"}
            size="sm"
            disabled={requested || isLoading}
            onClick={() => handleRequest(item.name)}
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
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-bold text-foreground">What's New</h2>
      </div>
      <p className="text-muted-foreground">Supercharge your social presence with these services.</p>

      {/* Recommended Section */}
      {recommendedItem && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" /> Recommended for You
          </h3>
          <div className="max-w-sm">
            {renderCard(recommendedItem, true)}
          </div>
        </div>
      )}

      {/* Solutions */}
      {solutions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Solutions</h3>
          <p className="text-sm text-muted-foreground mb-4">Our done-for-you plans to take your brand further.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {solutions.map((item) => renderCard(item, item.id === recommendedItem?.id))}
          </div>
        </div>
      )}

      {/* Upgrades */}
      {upgrades.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Upgrades</h3>
          <p className="text-sm text-muted-foreground mb-4">Add-on services to enhance your current plan.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upgrades.map((item) => renderCard(item, item.id === recommendedItem?.id))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No services available right now. Check back soon!</p>
      )}
    </div>
  );
}
