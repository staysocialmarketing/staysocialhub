import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Inbox, Mail, ImageIcon, Mic, Zap, MessageSquare, Archive, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface InboxItem {
  id: string;
  source_type: string | null;
  title: string | null;
  raw_input_text: string | null;
  attachment_url: string | null;
  voice_transcript: string | null;
  suggested_client: string | null;
  suggested_item_type: string | null;
  suggested_content_type: string | null;
  suggested_priority: string | null;
  suggested_assignee: string | null;
  suggested_project: string | null;
  suggested_subproject: string | null;
  agent_confidence: number | null;
  status: string;
  converted_to_type: string | null;
  converted_to_id: string | null;
  created_by_user_id: string;
  created_at: string;
}

const sourceIcons: Record<string, typeof Mail> = {
  email: Mail,
  screenshot: ImageIcon,
  voice_note: Mic,
  quick_capture: MessageSquare,
  automation: Zap,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-200",
  ai_processed: "bg-purple-500/10 text-purple-700 border-purple-200",
  needs_review: "bg-warning/10 text-warning border-warning/20",
  converted: "bg-green-500/10 text-green-700 border-green-200",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function UniversalInbox() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchItems = async () => {
    let q = supabase.from("universal_inbox").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    if (filterSource !== "all") q = q.eq("source_type", filterSource);
    const { data } = await q;
    setItems((data as InboxItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [filterStatus, filterSource]);

  const handleArchive = async (item: InboxItem) => {
    await supabase.from("universal_inbox").update({ status: "archived" } as any).eq("id", item.id);
    toast.success("Archived");
    fetchItems();
    setSelected(null);
  };

  const handleConvert = async (item: InboxItem, targetType: "task" | "request" | "think_tank") => {
    if (!profile) return;
    setConverting(true);

    let convertedId: string | null = null;

    if (targetType === "task") {
      const { data, error } = await supabase.from("tasks").insert({
        title: item.title || "Untitled",
        description: item.raw_input_text || null,
        created_by_user_id: profile.id,
        source_type: item.source_type || "inbox",
        raw_input_text: item.raw_input_text || null,
        raw_attachment_url: item.attachment_url || null,
        voice_transcript: item.voice_transcript || null,
        status: "todo",
      } as any).select("id").single();
      if (!error && data) convertedId = data.id;
    } else if (targetType === "think_tank") {
      const { data, error } = await supabase.from("think_tank_items").insert({
        title: item.title || "Untitled",
        body: item.raw_input_text || null,
        type: "idea",
        created_by_user_id: profile.id,
        source_type: item.source_type || "inbox",
        raw_input_text: item.raw_input_text || null,
        raw_attachment_url: item.attachment_url || null,
        voice_transcript: item.voice_transcript || null,
      } as any).select("id").single();
      if (!error && data) convertedId = data.id;
    }

    if (convertedId) {
      await supabase.from("universal_inbox").update({
        status: "converted",
        converted_to_type: targetType,
        converted_to_id: convertedId,
      } as any).eq("id", item.id);
      toast.success(`Converted to ${targetType.replace("_", " ")}`);
    } else {
      toast.error("Conversion failed");
    }

    setConverting(false);
    setSelected(null);
    fetchItems();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Inbox className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Universal Inbox</h2>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="ai_processed">AI Processed</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="screenshot">Screenshot</SelectItem>
            <SelectItem value="voice_note">Voice Note</SelectItem>
            <SelectItem value="quick_capture">Quick Capture</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No inbox items found.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const Icon = sourceIcons[item.source_type || ""] || MessageSquare;
            return (
              <Card key={item.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelected(item)}>
                <CardContent className="pt-4 flex items-start gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground truncate">{item.title || "Untitled"}</span>
                      <Badge variant="outline" className={statusColors[item.status] || ""}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {item.raw_input_text && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.raw_input_text}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(item.created_at), "MMM d")}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title || "Untitled"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={statusColors[selected.status] || ""}>{selected.status.replace("_", " ")}</Badge>
                  {selected.source_type && <Badge variant="secondary">{selected.source_type.replace("_", " ")}</Badge>}
                  {selected.agent_confidence != null && <Badge variant="secondary">{Math.round(selected.agent_confidence * 100)}% confidence</Badge>}
                </div>
                {selected.raw_input_text && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Content</p>
                    <p className="text-foreground whitespace-pre-wrap">{selected.raw_input_text}</p>
                  </div>
                )}
                {selected.voice_transcript && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Voice Transcript</p>
                    <p className="text-foreground">{selected.voice_transcript}</p>
                  </div>
                )}
                {selected.attachment_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Attachment</p>
                    <img src={selected.attachment_url} alt="" className="max-h-48 rounded-lg border" />
                  </div>
                )}
                {(selected.suggested_client || selected.suggested_priority || selected.suggested_project) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">AI Suggestions</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.suggested_client && <Badge variant="outline">Client: {selected.suggested_client}</Badge>}
                      {selected.suggested_priority && <Badge variant="outline">Priority: {selected.suggested_priority}</Badge>}
                      {selected.suggested_item_type && <Badge variant="outline">Type: {selected.suggested_item_type}</Badge>}
                      {selected.suggested_project && <Badge variant="outline">Project: {selected.suggested_project}</Badge>}
                    </div>
                  </div>
                )}
                {selected.converted_to_type && (
                  <p className="text-xs text-muted-foreground">Converted to {selected.converted_to_type.replace("_", " ")}</p>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selected.status !== "converted" && selected.status !== "archived" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleConvert(selected, "task")} disabled={converting}>
                      <ArrowRight className="h-3 w-3 mr-1" /> To Task
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleConvert(selected, "think_tank")} disabled={converting}>
                      <ArrowRight className="h-3 w-3 mr-1" /> To Think Tank
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(selected)}>
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
