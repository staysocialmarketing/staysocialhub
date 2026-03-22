import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, RefreshCw, Plug, Brain, CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function MeetingNotes() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const extractMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { data, error } = await supabase.functions.invoke("extract-meeting-data", {
        body: { note_id: noteId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      const r = data.results;
      toast.success(
        `Extracted: ${r.tasks_created} tasks, ${r.captures_created} captures, ${r.projects_created || 0} projects`
      );
    },
    onError: (err: any) => toast.error(err.message || "Extraction failed"),
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
                      extractMutation.mutate(note.id);
                    }}
                    disabled={extractMutation.isPending}
                  >
                    <Brain className="h-3.5 w-3.5" />
                    Extract
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
                  onClick={() => extractMutation.mutate(selectedNote.id)}
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
