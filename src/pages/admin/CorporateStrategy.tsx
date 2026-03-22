import { useState } from "react";
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
import { SectionHeader } from "@/components/ui/section-header";
import { Plus, Pencil, Trash2, BookOpen, Palette, FileText, Shield } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "design_prompt", label: "Design Prompt", icon: Palette, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "sop", label: "SOP", icon: FileText, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "guideline", label: "Brand Guideline", icon: Shield, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

interface Strategy {
  id: string;
  title: string;
  category: string;
  content: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export default function CorporateStrategy() {
  const { isSSAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("sop");
  const [content, setContent] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("corporate_strategies")
          .update({ title, category, content })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("corporate_strategies")
          .insert({ title, category, content, created_by_user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corporate-strategies"] });
      toast.success(editingId ? "Strategy updated" : "Strategy created");
      resetForm();
    },
    onError: () => toast.error("Failed to save strategy"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("corporate_strategies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corporate-strategies"] });
      toast.success("Strategy deleted");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setTitle("");
    setCategory("sop");
    setContent("");
  };

  const openEdit = (s: Strategy) => {
    setEditingId(s.id);
    setTitle(s.title);
    setCategory(s.category as Category);
    setContent(s.content);
    setDialogOpen(true);
  };

  const filtered = filterCategory === "all" ? strategies : strategies.filter(s => s.category === filterCategory);
  const getCat = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[1];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader
          icon={BookOpen}
          title="Strategy Playbook"
          subtitle="Corporate strategies, design prompts, and SOPs that apply across all clients"
        />
        {isSSAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="h-4 w-4" /> Add Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Strategy" : "New Strategy"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
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
                <Textarea
                  placeholder="Strategy content, instructions, or template..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="rounded-xl"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
                  <Button
                    onClick={() => upsertMutation.mutate()}
                    disabled={!title.trim() || !content.trim() || upsertMutation.isPending}
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
          size="sm"
          className="rounded-xl text-xs"
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
              size="sm"
              className="rounded-xl text-xs gap-1.5"
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
          {strategies.length === 0 ? "No strategies yet. Add your first one!" : "No strategies in this category."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const cat = getCat(s.category);
            const isExpanded = expandedId === s.id;
            return (
              <Card key={s.id} className="rounded-2xl border-border/50">
                <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <cat.icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium truncate">{s.title}</CardTitle>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${cat.color}`}>
                        {cat.label}
                      </Badge>
                    </div>
                    {isSSAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
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
