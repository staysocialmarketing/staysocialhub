import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package, Plus, Send, ChevronDown, Clock, CheckCircle, AlertTriangle, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/* ─── Types ─────────────────────────────────────────────────────── */
interface UnbatchedPost {
  id: string;
  title: string;
  client_id: string;
  creative_url?: string | null;
  platform?: string | null;
  content_type?: string | null;
  clients?: { name: string } | null;
}

interface BatchItem {
  id: string;
  post_id: string;
  posts?: UnbatchedPost | null;
}

interface Batch {
  id: string;
  client_id: string;
  name: string;
  batch_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
  approval_batch_items?: BatchItem[];
}

/* ─── Status helpers ────────────────────────────────────────────── */
function deriveBatchDisplayStatus(batch: Batch, postStatusMap: Record<string, string>): string {
  if (batch.status === "draft") return "draft";
  const items = batch.approval_batch_items || [];
  if (items.length === 0) return batch.status;

  const statuses = items.map((i) => postStatusMap[i.post_id] || "client_approval");
  const allApproved = statuses.every((s) => ["approved", "ready_to_schedule", "ready_to_send", "scheduled", "published", "sent", "complete"].includes(s));
  const allScheduledOrDone = statuses.every((s) => ["scheduled", "published", "sent", "complete"].includes(s));
  const allComplete = statuses.every((s) => ["published", "sent", "complete"].includes(s));
  const anyChanges = statuses.some((s) => s === "request_changes");

  if (allComplete) return "completed";
  if (allScheduledOrDone) return "scheduled";
  if (allApproved) return "approved";
  if (anyChanges) return "needs_changes";
  if (statuses.some((s) => ["approved", "ready_to_schedule", "ready_to_send"].includes(s)) && statuses.some((s) => s === "client_approval")) return "partially_approved";
  return "sent_to_client";
}

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent_to_client: { label: "Sent to Client", className: "bg-blue-100 text-blue-800" },
  partially_approved: { label: "Partially Approved", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  needs_changes: { label: "Needs Changes", className: "bg-destructive/10 text-destructive" },
  scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
};

/* ─── Main Component ────────────────────────────────────────────── */
export default function ApprovalBatchManager({
  unbatchedPosts,
  allPosts,
}: {
  unbatchedPosts: UnbatchedPost[];
  allPosts: { id: string; status_column: string }[];
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  // Fetch batches
  const { data: batches = [] } = useQuery({
    queryKey: ["approval-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_batches")
        .select("*, clients(name), approval_batch_items(id, post_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Batch[];
    },
  });

  // Fetch which post_ids are already in a batch
  const { data: batchedPostIds = new Set<string>() } = useQuery({
    queryKey: ["batched-post-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_batch_items")
        .select("post_id");
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.post_id));
    },
  });

  const postStatusMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPosts.forEach((p) => { map[p.id] = p.status_column; });
    return map;
  }, [allPosts]);

  const trulyUnbatched = unbatchedPosts.filter((p) => !batchedPostIds.has(p.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === trulyUnbatched.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trulyUnbatched.map((p) => p.id)));
    }
  };

  const activeBatches = batches.filter((b) => !["completed"].includes(deriveBatchDisplayStatus(b, postStatusMap)));
  const completedBatches = batches.filter((b) => deriveBatchDisplayStatus(b, postStatusMap) === "completed");

  return (
    <div className="space-y-6">
      {/* ── Unbatched Items ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Unbatched Items
            <Badge variant="secondary">{trulyUnbatched.length}</Badge>
          </h4>
          <div className="flex gap-2">
            {trulyUnbatched.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs" onClick={selectAll}>
                {selected.size === trulyUnbatched.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            {selected.size > 0 && (
              <Button size="sm" className="text-xs gap-1" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3 w-3" /> Create Batch ({selected.size})
              </Button>
            )}
          </div>
        </div>
        {trulyUnbatched.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">All items are batched</CardContent></Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trulyUnbatched.map((post) => (
              <Card
                key={post.id}
                className={`cursor-pointer transition-all ${selected.has(post.id) ? "ring-2 ring-primary" : ""}`}
                onClick={() => toggleSelect(post.id)}
              >
                <CardContent className="p-3 flex items-start gap-2">
                  <Checkbox
                    checked={selected.has(post.id)}
                    onCheckedChange={() => toggleSelect(post.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{post.title}</p>
                    {post.clients?.name && (
                      <Badge variant="outline" className="text-[10px] mt-1">{post.clients.name}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Batches ── */}
      {activeBatches.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Active Batches
            <Badge variant="secondary">{activeBatches.length}</Badge>
          </h4>
          <div className="space-y-3">
            {activeBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} postStatusMap={postStatusMap} />
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Batches ── */}
      {completedBatches.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="text-sm gap-2 mb-2">
              <ChevronDown className="h-4 w-4" />
              Completed Batches ({completedBatches.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3">
              {completedBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} postStatusMap={postStatusMap} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Create Batch Dialog ── */}
      <CreateBatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        selectedPostIds={Array.from(selected)}
        posts={trulyUnbatched}
        onCreated={() => { setSelected(new Set()); setCreateOpen(false); }}
      />
    </div>
  );
}

/* ─── Batch Card ────────────────────────────────────────────────── */
function BatchCard({ batch, postStatusMap }: { batch: Batch; postStatusMap: Record<string, string> }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const displayStatus = deriveBatchDisplayStatus(batch, postStatusMap);
  const badge = statusBadgeConfig[displayStatus] || statusBadgeConfig.draft;
  const items = batch.approval_batch_items || [];

  const sendToClient = useMutation({
    mutationFn: async () => {
      // Update all posts to client_approval
      const postIds = items.map((i) => i.post_id);
      const { error: postErr } = await supabase
        .from("posts")
        .update({ status_column: "client_approval" } as any)
        .in("id", postIds);
      if (postErr) throw postErr;

      // Update batch status
      const { error: batchErr } = await supabase
        .from("approval_batches")
        .update({ status: "sent_to_client", sent_at: new Date().toISOString() } as any)
        .eq("id", batch.id);
      if (batchErr) throw batchErr;

      // Send notification
      await supabase.rpc("notify_batch_sent_to_client" as any, {
        _batch_name: batch.name,
        _client_id: batch.client_id,
        _item_count: postIds.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-batches"] });
      queryClient.invalidateQueries({ queryKey: ["approval-posts"] });
      queryClient.invalidateQueries({ queryKey: ["client-approval-posts"] });
      toast.success(`Batch "${batch.name}" sent to client`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resendReminder = useMutation({
    mutationFn: async () => {
      await supabase.rpc("notify_batch_sent_to_client" as any, {
        _batch_name: batch.name + " (reminder)",
        _client_id: batch.client_id,
        _item_count: items.length,
      });
    },
    onSuccess: () => toast.success("Reminder sent"),
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{batch.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {batch.clients?.name && <span>{batch.clients.name}</span>}
                <span>·</span>
                <span>{items.length} items</span>
                {batch.sent_at && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Sent {format(new Date(batch.sent_at), "MMM d")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{batch.batch_type}</Badge>
            {displayStatus === "draft" && items.length > 0 && (
              <Button
                size="sm"
                className="text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); sendToClient.mutate(); }}
                disabled={sendToClient.isPending}
              >
                <Send className="h-3 w-3" /> Send
              </Button>
            )}
            {displayStatus === "sent_to_client" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={(e) => { e.stopPropagation(); resendReminder.mutate(); }}
                disabled={resendReminder.isPending}
              >
                Remind
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setExpanded(!expanded)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
        {expanded && items.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            {items.map((item) => {
              const status = postStatusMap[item.post_id] || "unknown";
              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">{item.post_id.substring(0, 8)}…</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{status.replace(/_/g, " ")}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Create Batch Dialog ───────────────────────────────────────── */
function CreateBatchDialog({
  open,
  onOpenChange,
  selectedPostIds,
  posts,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedPostIds: string[];
  posts: UnbatchedPost[];
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Derive client from selected posts
  const selectedPosts = posts.filter((p) => selectedPostIds.includes(p.id));
  const clientIds = [...new Set(selectedPosts.map((p) => p.client_id))];
  const clientName = selectedPosts[0]?.clients?.name || "";
  const weekNum = Math.ceil(new Date().getDate() / 7);

  const [name, setName] = useState("");
  const [batchType, setBatchType] = useState("weekly");

  // Auto-suggest name when dialog opens
  const suggestedName = clientName ? `${clientName} – Week ${weekNum} Content` : "";

  const create = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      if (clientIds.length !== 1) throw new Error("All selected items must belong to the same client");
      const batchName = name.trim() || suggestedName;
      if (!batchName) throw new Error("Batch name required");

      // Create batch
      const { data: batch, error: bErr } = await supabase
        .from("approval_batches")
        .insert({
          client_id: clientIds[0],
          name: batchName,
          batch_type: batchType,
          created_by_user_id: profile.id,
        } as any)
        .select("id")
        .single();
      if (bErr) throw bErr;

      // Add items
      const itemRows = selectedPostIds.map((postId) => ({
        batch_id: (batch as any).id,
        post_id: postId,
      }));
      const { error: iErr } = await supabase
        .from("approval_batch_items")
        .insert(itemRows as any);
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batched-post-ids"] });
      toast.success("Batch created");
      setName("");
      onCreated();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Approval Batch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {clientIds.length > 1 && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Selected items span multiple clients. Please select items from one client only.
            </p>
          )}
          <div>
            <Label>Batch Name</Label>
            <Input
              placeholder={suggestedName || "e.g. Karen B – Week 2 Content"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {suggestedName && !name && (
              <p className="text-xs text-muted-foreground mt-1">Will use: {suggestedName}</p>
            )}
          </div>
          <div>
            <Label>Batch Type</Label>
            <Select value={batchType} onValueChange={setBatchType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Items ({selectedPostIds.length})</Label>
            <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
              {selectedPosts.map((p) => (
                <div key={p.id} className="text-sm text-foreground truncate flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                  {p.title}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || clientIds.length !== 1}
          >
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
