import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientFilter } from "@/contexts/ClientFilterContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Target, ChevronRight } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { REQUEST_TYPE_OPTIONS, getColumnForView, CLIENT_PIPELINE_COLUMNS } from "@/lib/workflowUtils";
import FilterBar, { useFilterBar, PRIORITY_FILTER_OPTIONS } from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";
import { EmptyState } from "@/components/ui/empty-state";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.pptx,.txt";

const clientStatusConfig: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  for_approval: "bg-violet-500/10 text-violet-600",
  in_queue: "bg-emerald-500/10 text-emerald-600",
  posted: "bg-muted text-muted-foreground",
};

const statusFilterOptions = CLIENT_PIPELINE_COLUMNS.map((col) => ({ value: col.key, label: col.label }));

export default function Requests() {
  const navigate = useNavigate();
  const { profile, realProfile, isSSRole, isSSAdmin, isImpersonating } = useAuth();
  const { selectedClientId: globalClientId } = useClientFilter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [form, setForm] = useState({
    type: "social_post",
    topic: "",
    notes: "",
    preferred_publish_window: "",
    priority: "normal",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
    enabled: isSSAdmin,
  });

  const { data: ssUsers = [] } = useQuery({
    queryKey: ["ss-users-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["ss_admin", "ss_producer", "ss_ops", "ss_team"]);
      if (!roles?.length) return [];
      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data } = await supabase.from("users").select("id, name, email").in("id", userIds);
      return data || [];
    },
    enabled: isSSRole,
  });

  const filterConfigs: FilterConfig[] = [
    ...(isSSAdmin ? [{ key: "client", label: "Client", options: clients.map((c: any) => ({ value: c.id, label: c.name })) }] : []),
    { key: "requestType", label: "Type", options: REQUEST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
    ...(isSSRole ? [{ key: "assignee", label: "Assigned To", options: ssUsers.map((u: any) => ({ value: u.id, label: u.name || u.email })) }] : []),
    { key: "priority", label: "Priority", options: PRIORITY_FILTER_OPTIONS },
    { key: "status", label: "Status", options: statusFilterOptions },
  ];
  const { values: filterValues, setValues: setFilterValues } = useFilterBar(filterConfigs, "requests");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["requests", profile?.client_id, globalClientId],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("*, users!posts_created_by_user_id_fkey(name, email), clients(name)")
        .eq("source", "client_request")
        .order("created_at", { ascending: false });
      if (profile?.client_id) query = query.eq("client_id", profile.client_id);
      else if (globalClientId) query = query.eq("client_id", globalClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const filteredPosts = posts.filter((post: any) => {
    if (filterValues.requestType !== "all" && post.content_type !== filterValues.requestType) return false;
    if (filterValues.client !== "all" && post.client_id !== filterValues.client) return false;
    if (filterValues.assignee !== "all" && post.assigned_to_user_id !== filterValues.assignee) return false;
    if (filterValues.priority !== "all" && (post.priority || "normal") !== filterValues.priority) return false;
    if (filterValues.status !== "all" && getColumnForView(post.status_column, "client")?.key !== filterValues.status) return false;
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File too large — maximum 10MB");
      e.target.value = "";
      return;
    }
    setAttachmentFile(file);
  };

  const createRequest = useMutation({
    mutationFn: async () => {
      const clientId = isSSAdmin ? selectedClientId : profile?.client_id;
      if (!clientId) throw new Error("No client selected");

      let creative_url: string | null = null;
      if (attachmentFile) {
        const compressed = await compressImage(attachmentFile);
        const ext = compressed.name.split(".").pop();
        const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("request-attachments").upload(path, compressed);
        if (uploadError) {
          toast.warning("Attachment upload failed — request will be created without it");
        } else {
          creative_url = path;
        }
      }

      const { error } = await supabase.from("posts").insert({
        source: "client_request",
        status_column: "idea",
        title: form.topic,
        content_type: form.type,
        client_id: clientId,
        created_by_user_id: isImpersonating ? realProfile!.id : profile!.id,
        request_notes: form.notes || null,
        preferred_publish_window: form.preferred_publish_window || null,
        priority: form.priority,
        creative_url,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      queryClient.invalidateQueries({ queryKey: ["client-pipeline-posts"] });
      toast.success("Request submitted!");
      setOpen(false);
      setForm({ type: "social_post", topic: "", notes: "", preferred_publish_window: "", priority: "normal" });
      setAttachmentFile(null);
      setSelectedClientId("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit request"),
  });

  const canCreate = !!profile?.client_id || isSSAdmin;

  const getTypeLabel = (type: string | null) => {
    if (!type) return "—";
    return REQUEST_TYPE_OPTIONS.find((o) => o.value === type)?.label || type.replace(/_/g, " ");
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Requests</h1>
          <p className="text-muted-foreground mt-1">Submit and track content requests</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Content Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {isSSAdmin && (
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Request Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Topic / Title</Label>
                  <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="What's this about?" />
                </div>
                <div>
                  <Label>Preferred Publish Window</Label>
                  <Input value={form.preferred_publish_window} onChange={(e) => setForm({ ...form, preferred_publish_window: e.target.value })} placeholder="e.g. Next week, March 15" />
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." /></div>
                <div>
                  <Label>Attachment (max 10MB)</Label>
                  <Input type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground mt-1">PDF, images, docs, spreadsheets, presentations</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" onClick={() => createRequest.mutate()} disabled={!form.topic || createRequest.isPending || (isSSAdmin && !selectedClientId)}>
                  {createRequest.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description={canCreate ? "Create your first content request to get started." : "No requests to show."}
          icon={<Plus className="h-8 w-8" />}
        />
      ) : (
        <div className="card-elevated divide-y divide-border/40">
          {filteredPosts.map((post: any) => {
            const clientCol = getColumnForView(post.status_column, "client");
            const statusLabel = clientCol?.label ?? post.status_column;
            const statusClass = clientStatusConfig[clientCol?.key ?? ""] ?? "bg-muted text-muted-foreground";
            return (
              <div
                key={post.id}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/approvals/${post.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-medium text-sm text-foreground truncate">{post.title}</h4>
                    {isSSRole && post.strategy_brief && typeof post.strategy_brief === "object" && Object.values(post.strategy_brief).some((v: any) => v && String(v).trim()) && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5 bg-primary/10 text-primary shrink-0">
                        <Target className="h-2.5 w-2.5" /> Strategy
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {post.clients?.name && <span className="font-medium">{post.clients.name} · </span>}
                    {getTypeLabel(post.content_type)} · {new Date(post.created_at).toLocaleDateString()}
                    {post.creative_url && " · 📎"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${statusClass} border-0 text-[10px]`}>{statusLabel}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
