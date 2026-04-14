import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, RefreshCw, Plug, Brain, CheckCircle2, Clock, AlertCircle, Trash2, FolderOpen, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-muted text-muted-foreground",
};

// ── Review dialog state ───────────────────────────────────────────────────────

interface ExtractedDraft {
  note_id: string;
  note_title: string;
  extracted: {
    client_id?: string;
    summary?: string;
    action_items?: any[];
    projects?: any[];
    content_ideas?: any[];
    strategy_updates?: any;
  };
}

interface CheckedState {
  action_items: boolean[];
  projects: boolean[];
  content_ideas: boolean[];
}

function ReviewDialog({
  draft,
  onConfirm,
  onCancel,
  saving,
}: {
  draft: ExtractedDraft;
  onConfirm: (confirmed: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { extracted } = draft;
  const [checked, setChecked] = useState<CheckedState>({
    action_items: (extracted.action_items || []).map(() => true),
    projects: (extracted.projects || []).map(() => true),
    content_ideas: (extracted.content_ideas || []).map(() => true),
  });

  const toggle = (section: keyof CheckedState, i: number) => {
    setChecked(prev => ({
      ...prev,
      [section]: prev[section].map((v, idx) => idx === i ? !v : v),
    }));
  };

  const handleConfirm = () => {
    onConfirm({
      client_id: extracted.client_id,
      summary: extracted.summary,
      action_items: (extracted.action_items || []).filter((_, i) => checked.action_items[i]),
      projects: (extracted.projects || []).filter((_, i) => checked.projects[i]),
      content_ideas: (extracted.content_ideas || []).filter((_, i) => checked.content_ideas[i]),
      strategy_updates: extracted.strategy_updates || {},
    });
  };

  const totalSelected =
    checked.action_items.filter(Boolean).length +
    checked.projects.filter(Boolean).length +
    checked.content_ideas.filter(Boolean).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Review Extracted Data</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            From: <span className="font-medium">{draft.note_title}</span>
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div className="space-y-5 py-1">
            {extracted.summary && (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                {extracted.summary}
              </div>
            )}

            {/* Action Items */}
            {(extracted.action_items || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tasks ({checked.action_items.filter(Boolean).length} / {extracted.action_items!.length} selected)
                </h3>
                {extracted.action_items!.map((item, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked.action_items[i] ? "bg-card border-border" : "bg-muted/20 border-border/30 opacity-50"
                    }`}
                  >
                    <Checkbox
                      checked={checked.action_items[i]}
                      onCheckedChange={() => toggle("action_items", i)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.priority && (
                          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[item.priority] || ""}`}>
                            {item.priority}
                          </Badge>
                        )}
                        {item.suggested_owner && (
                          <Badge variant="secondary" className="text-xs">
                            → {item.suggested_owner}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                      {item.project_name && (
                        <p className="text-xs text-muted-foreground/70">Project: {item.project_name}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Projects */}
            {(extracted.projects || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Projects ({checked.projects.filter(Boolean).length} / {extracted.projects!.length} selected)
                </h3>
                {extracted.projects!.map((proj, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked.projects[i] ? "bg-card border-border" : "bg-muted/20 border-border/30 opacity-50"
                    }`}
                  >
                    <Checkbox
                      checked={checked.projects[i]}
                      onCheckedChange={() => toggle("projects", i)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{proj.name}</span>
                        {proj.existing_project_id && (
                          <Badge variant="outline" className="text-xs">existing</Badge>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-xs text-muted-foreground">{proj.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Content Ideas */}
            {(extracted.content_ideas || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Content Ideas ({checked.content_ideas.filter(Boolean).length} / {extracted.content_ideas!.length} selected)
                </h3>
                {extracted.content_ideas!.map((idea, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked.content_ideas[i] ? "bg-card border-border" : "bg-muted/20 border-border/30 opacity-50"
                    }`}
                  >
                    <Checkbox
                      checked={checked.content_ideas[i]}
                      onCheckedChange={() => toggle("content_ideas", i)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{idea.title}</span>
                        {idea.content_type && (
                          <Badge variant="outline" className="text-xs">{idea.content_type}</Badge>
                        )}
                      </div>
                      {idea.description && (
                        <p className="text-xs text-muted-foreground">{idea.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {(extracted.action_items || []).length === 0 &&
             (extracted.projects || []).length === 0 &&
             (extracted.content_ideas || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items were extracted from this note.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-3 border-t gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Discard
          </Button>
          <Button onClick={handleConfirm} disabled={saving || totalSelected === 0}>
            {saving ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : (
              `Confirm & Save${totalSelected > 0 ? ` (${totalSelected})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MeetingNotes() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [extractedDraft, setExtractedDraft] = useState<ExtractedDraft | null>(null);

  // Detect ?connected=true from OAuth callback
  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      toast.success("Google connected successfully!");
      searchParams.delete("connected");
      setSearchParams(searchParams, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["google-integration"] });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const { data: integration, isLoading: loadingIntegration } = useQuery({
    queryKey: ["google-integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_integrations" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ["meeting-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_notes" as any)
        .select("*, clients(name)")
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const connectGoogle = () => {
    const clientId = "508191597658-jkqgk7e36u69d3t3i36mn70el1apff60.apps.googleusercontent.com";
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`;
    const scope = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly";
    const state = JSON.stringify({ token: session?.access_token || "", origin: window.location.origin });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
    window.location.href = url;
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-meeting-notes", {
        body: { since_days: 30 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      toast.success(`Synced ${data.synced} new notes (${data.skipped} already synced)`);
    },
    onError: (err: any) => toast.error(err.message || "Sync failed"),
  });

  // Step 1: dry_run extraction — returns AI result for review
  const extractMutation = useMutation({
    mutationFn: async (note: any) => {
      const { data, error } = await supabase.functions.invoke("extract-meeting-data", {
        body: { note_id: note.id, dry_run: true },
      });
      if (error) throw error;
      return { note, data };
    },
    onSuccess: ({ note, data }) => {
      setExtractedDraft({
        note_id: note.id,
        note_title: note.title,
        extracted: data.extracted,
      });
    },
    onError: (err: any) => toast.error(err.message || "Extraction failed"),
  });

  // Step 2: save confirmed items
  const saveMutation = useMutation({
    mutationFn: async ({ note_id, confirmed_items }: { note_id: string; confirmed_items: any }) => {
      const { data, error } = await supabase.functions.invoke("extract-meeting-data", {
        body: { note_id, dry_run: false, confirmed_items },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      setExtractedDraft(null);
      const r = data.results;
      toast.success(
        `Saved: ${r.tasks_created} tasks, ${r.captures_created} captures, ${r.projects_created || 0} projects`
      );
    },
    onError: (err: any) => toast.error(err.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("meeting_notes" as any)
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      toast.success("Meeting note deleted");
      setDeleteTarget(null);
      if (selectedNote?.id === deleteTarget?.id) setSelectedNote(null);
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing": return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isConnected = !!integration;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Meeting Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sync and extract data from Google Meet notes (last 30 days)
          </p>
        </div>
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                <Plug className="h-3 w-3" /> Connected
              </Badge>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Syncing…" : "Sync Now"}
              </Button>
            </>
          ) : (
            <Button onClick={connectGoogle} size="sm" className="gap-1.5" disabled={loadingIntegration}>
              <Plug className="h-4 w-4" />
              Connect Google
            </Button>
          )}
        </div>
      </div>

      {loadingNotes ? (
        <p className="text-muted-foreground text-sm">Loading notes…</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {isConnected
                ? 'No meeting notes synced yet. Click "Sync Now" to pull notes from Google Drive.'
                : "Connect your Google account to start syncing meeting notes."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(notes as any[]).map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedNote(note)}
            >
              <CardContent className="py-4 flex items-center gap-4">
                {statusIcon(note.extraction_status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{note.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {note.meeting_date && (
                      <span className="text-xs text-muted-foreground">{note.meeting_date}</span>
                    )}
                    {(note as any).clients?.name && (
                      <Badge variant="secondary" className="text-xs">{(note as any).clients.name}</Badge>
                    )}
                    <Badge
                      variant={note.extraction_status === "done" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {note.extraction_status}
                    </Badge>
                  </div>
                </div>
                {note.extraction_status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      extractMutation.mutate(note);
                    }}
                    disabled={extractMutation.isPending}
                  >
                    {extractMutation.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Brain className="h-3.5 w-3.5" />
                    )}
                    {extractMutation.isPending ? "Extracting…" : "Extract"}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(note);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review dialog — shown after dry_run extraction */}
      {extractedDraft && (
        <ReviewDialog
          draft={extractedDraft}
          saving={saveMutation.isPending}
          onConfirm={(confirmed_items) => {
            saveMutation.mutate({ note_id: extractedDraft.note_id, confirmed_items });
          }}
          onCancel={() => setExtractedDraft(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meeting note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedNote?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedNote?.meeting_date && <span>Date: {selectedNote.meeting_date}</span>}
                {(selectedNote as any)?.clients?.name && (
                  <Badge variant="secondary">{(selectedNote as any).clients.name}</Badge>
                )}
                <Badge variant="outline">{selectedNote?.extraction_status}</Badge>
              </div>

              {selectedNote?.extraction_status === "pending" && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setSelectedNote(null);
                    extractMutation.mutate(selectedNote);
                  }}
                  disabled={extractMutation.isPending}
                >
                  <Brain className="h-4 w-4" />
                  {extractMutation.isPending ? "Extracting…" : "Extract Data"}
                </Button>
              )}

              {selectedNote?.extracted_data && Object.keys(selectedNote.extracted_data).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Extracted Data</h3>
                    {selectedNote.extracted_data.summary && (
                      <p className="text-sm text-muted-foreground mb-3">{selectedNote.extracted_data.summary}</p>
                    )}
                    {selectedNote.extracted_data.action_items?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Action Items</h4>
                        <ul className="space-y-1">
                          {selectedNote.extracted_data.action_items.map((item: any, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                              <span>{item.title}{item.description ? ` — ${item.description}` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedNote.extracted_data.projects?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Projects</h4>
                        <ul className="space-y-1">
                          {selectedNote.extracted_data.projects.map((proj: any, i: number) => (
                            <li key={i} className="text-sm">
                              <span className="font-medium">{proj.name}</span>
                              {proj.description && <span className="text-muted-foreground"> — {proj.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedNote.extracted_data.content_ideas?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Content Ideas</h4>
                        <ul className="space-y-1">
                          {selectedNote.extracted_data.content_ideas.map((idea: any, i: number) => (
                            <li key={i} className="text-sm">
                              <Badge variant="outline" className="text-xs mr-2">{idea.content_type}</Badge>
                              {idea.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedNote.extracted_data.routing_results && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        Results: {selectedNote.extracted_data.routing_results.tasks_created} tasks,{" "}
                        {selectedNote.extracted_data.routing_results.captures_created} captures,{" "}
                        {selectedNote.extracted_data.routing_results.projects_created || 0} projects
                        {selectedNote.extracted_data.routing_results.strategy_updated && ", strategy updated"}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Raw Content</h3>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-[300px] overflow-auto">
                  {selectedNote?.raw_content || "No content"}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
