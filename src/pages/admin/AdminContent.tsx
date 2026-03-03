import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";

const statusLabels: Record<string, string> = {
  new_requests: "New",
  content_process: "Content",
  design_process: "Design",
  request_changes: "Changes",
  content_for_approval: "For Approval",
  approved: "Approved",
  in_the_queue: "Queued",
  published: "Published",
};

export default function AdminContent() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Content Management</h2>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                  {p.creative_url ? (
                    <img src={p.creative_url} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{p.title}</h4>
                  <p className="text-xs text-muted-foreground">{p.clients?.name} · {p.platform || "No platform"}</p>
                </div>
                <Badge variant="secondary">{statusLabels[p.status_column] || p.status_column}</Badge>
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-muted-foreground text-center py-8">No content yet</p>}
        </div>
      )}
    </div>
  );
}
