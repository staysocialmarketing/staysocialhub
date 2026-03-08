import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Version {
  id: string;
  major_version: number;
  minor_version: number;
  title: string | null;
  notes: string | null;
  published_at: string | null;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({ open, onOpenChange }: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("platform_versions")
      .select("id, major_version, minor_version, title, notes, published_at")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setVersions((data as Version[]) || []);
        setLoading(false);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Version History
          </DialogTitle>
          <DialogDescription>All platform releases and updates.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No versions published yet.</p>
          ) : (
            <div className="space-y-3 pb-2">
              {versions.map((v, i) => (
                <Card key={v.id} className={i === 0 ? "border-primary/30" : ""}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={i === 0 ? "default" : "outline"}
                            className={`text-xs shrink-0 ${i !== 0 ? (v.minor_version === 0 ? "border-orange-400 text-orange-600 bg-orange-50" : "border-blue-400 text-blue-600 bg-blue-50") : ""}`}
                          >
                            V{v.major_version}.{v.minor_version}
                          </Badge>
                          {i === 0 && (
                            <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                          )}
                          {v.title && <span className="font-medium text-foreground text-sm">{v.title}</span>}
                        </div>
                        {v.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{v.notes}</p>}
                      </div>
                      {v.published_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(v.published_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
