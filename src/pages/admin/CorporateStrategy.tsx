import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, Palette, FileText, Shield, Upload, ExternalLink, File } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "design_prompt", label: "Design Prompt", icon: Palette, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "sop", label: "SOP", icon: FileText, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "guideline", label: "Brand Guideline", icon: Shield, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
] as const;

type Category = typeof CATEGORIES[number]["value"];
type EntryMode = "text" | "file";

interface FilePayload {
  __type: "file";
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

interface Strategy {
  id: string;
  title: string;
  category: string;
  content: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

function parseFileContent(content: string): FilePayload | null {
  if (!content.startsWith('{"__type":"file"')) return null;
  try { return JSON.parse(content) as FilePayload; } catch { return null; }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CorporateStrategy() {
  const { isSSAdmin, isSSManager, isSSTeam, user } = useAuth();
  const canManage = isSSAdmin || isSSManager || isSSTeam;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<EntryMode>("text");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("sop");
  const [content, setContent] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<FilePayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ["corporate-strategies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corporate_strategies")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Strategy[];
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `strategy-files/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error: uploadErr } = await supabase.storage.from("creative-assets").upload(path, file);
    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(path);
    const payload: FilePayload = {
      __type: "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    };
    setPendingFile(payload);
    setUploading(false);
    toast.success("File uploaded — save the entry to confirm");
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const finalContent = mode === "file"
        ? (pendingFile ? JSON.stringify(pendingFile) : content)
        : content;

      if (editingId) {
        const { error } = await supabase
          .from("corporate_strategies")
          .update({ title, category, content: finalContent })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("corporate_strategies")
          .insert({ title, category, content: finalContent, created_by_user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corporate-strategies"] });
      toast.success(editingId ? "Entry updated" : "Entry created");
      resetForm();
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("corporate_strategies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corporate-strategies"] });
      toast.success("Deleted");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setMode("text");
    setTitle("");
    setCategory("sop");
    setContent("");
    setPendingFile(null);
  };

  const openEdit = (s: Strategy) => {
    setEditingId(s.id);
    setTitle(s.title);
    setCategory(s.category as Category);
    const parsed = parseFileContent(s.content);
    if (parsed) {
      setMode("file");
      setPendingFile(parsed);
    } else {
      setMode("text");
      setContent(s.content);
    }
    setDialogOpen(true);
  };

  const filtered = filterCategory === "all" ? strategies : strategies.filter(s => s.category === filterCategory);
  const getCat = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[1];

  const canSave = title.trim() && (
    mode === "text" ? content.trim() : (pendingFile !== null || (editingId !== null && parseFileContent(content) !== null))
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Strategy Playbook</h1>
          </div>
          <p className="text-sm text-muted-foreground">Corporate strategies, SOPs, and design guidelines across all clients</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Entry" : "New Entry"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Mode tabs */}
                {!editingId && (
                  <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
                    <button
                      onClick={() => { setMode("text"); setPendingFile(null); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === "text" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => { setMode("file"); setContent(""); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === "file" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      File / PDF
                    </button>
                  </div>
                )}

                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl"
                />
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {mode === "text" ? (
                  <Textarea
                    placeholder="Strategy content, instructions, or template..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="rounded-xl"
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {pendingFile ? (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border">
                        <File className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{pendingFile.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.file_size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground rounded-lg shrink-0"
                          onClick={() => fileRef.current?.click()}
                        >
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? "Uploading..." : "Click to upload PDF or file"}
                        </span>
                        <span className="text-xs text-muted-foreground/60">PDF, DOC, TXT, MD, images</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
                  <Button
                    onClick={() => upsertMutation.mutate()}
                    disabled={!canSave || upsertMutation.isPending || uploading}
                    className="rounded-xl"
                  >
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterCategory === "all" ? "default" : "outline"}
          size="sm" className="rounded-xl text-xs"
          onClick={() => setFilterCategory("all")}
        >
          All ({strategies.length})
        </Button>
        {CATEGORIES.map(c => {
          const count = strategies.filter(s => s.category === c.value).length;
          return (
            <Button
              key={c.value}
              variant={filterCategory === c.value ? "default" : "outline"}
              size="sm" className="rounded-xl text-xs gap-1.5"
              onClick={() => setFilterCategory(c.value)}
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label} ({count})
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {strategies.length === 0 ? "No entries yet. Add your first one!" : "No entries in this category."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const cat = getCat(s.category);
            const isExpanded = expandedId === s.id;
            const filePayload = parseFileContent(s.content);

            return (
              <Card key={s.id} className="rounded-2xl border-border/50">
                <CardHeader
                  className="p-4 pb-2 cursor-pointer"
                  onClick={() => !filePayload && setExpandedId(isExpanded ? null : s.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {filePayload
                        ? <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                        : <cat.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      }
                      <CardTitle className="text-sm font-medium truncate">{s.title}</CardTitle>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${cat.color}`}>
                        {cat.label}
                      </Badge>
                      {filePayload && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                          PDF / File
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {filePayload && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); window.open(filePayload.file_url, "_blank"); }}
                          title="Open file"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canManage && (
                        <>
                          {!filePayload && (
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* File entry: show file info inline */}
                {filePayload && (
                  <CardContent className="px-4 pb-4 pt-1">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <File className="h-6 w-6 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{filePayload.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(filePayload.file_size)}</p>
                      </div>
                      <a
                        href={filePayload.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                )}

                {/* Text entry: expand/collapse */}
                {!filePayload && isExpanded && (
                  <CardContent className="px-4 pb-4 pt-1">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                      {s.content}
                    </pre>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
