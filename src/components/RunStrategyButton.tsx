import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface RunStrategyButtonProps {
  itemType: "task" | "request" | "think_tank";
  itemId: string;
  size?: "sm" | "default";
}

export default function RunStrategyButton({ itemType, itemId, size = "sm" }: RunStrategyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("run-strategy", {
        body: { item_type: itemType, item_id: itemId },
      });
      if (error) throw error;
      toast.success("Strategy request sent to automation");
    } catch (err: any) {
      toast.error(err.message || "Failed to run strategy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
      Run Strategy
    </Button>
  );
}
