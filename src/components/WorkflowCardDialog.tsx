import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Clock, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CONTENT_TYPES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "reel", label: "Reel" },
  { value: "carousel", label: "Carousel" },
];

interface WorkflowCardDialogProps {
  post: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssUsers: any[];
}

export default function WorkflowCardDialog({ post, open, onOpenChange, ssUsers }: WorkflowCardDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption || "");
  const [contentType, setContentType] = useState(post.content_type || "");
  const [assignedTo, setAssignedTo] = useState(post.assigned_to_user_id || "");
  const [reviewer, setReviewer] = useState(post.reviewer_user_id || "");
  const [dueAt, setDueAt] = useState<Date | null>(post.due_at ? new Date(post.due_at) : null);

  const { data: linkedRequest } = useQuery({
    queryKey: ["linked-request", post.request_id],
    queryFn: async () => {
      if (!post.request_id) return null;
      const { data, error } = await supabase
        .from("requests")
        .select("id, topic, notes, type, status, priority")
        .eq("id", post.request_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!post.request_id,
  });

  const updatePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({
          title,
          caption: caption || null,
          content_type: contentType || null,
          assigned_to_user_id: assignedTo || null,
          reviewer_user_id: reviewer || null,
          due_at: dueAt?.toISOString() || null,
        } as any)
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-posts"] });
      toast.success("Post updated");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Post
            {post.request_id && (
              <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground">
                <FileText className="h-3 w-3 mr-1" />
                From Request
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Client (read-only) */}
          {post.clients?.name && (
            <div>
              <Label className="text-muted-foreground text-xs">Client</Label>
              <p className="text-sm font-medium">{post.clients.name}</p>
            </div>
          )}

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>Caption / Description</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Clock className="h-4 w-4 mr-2" />
                  {dueAt ? format(dueAt, "PPP") : "Pick a due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarWidget mode="single" selected={dueAt || undefined} onSelect={(d) => setDueAt(d || null)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assigned to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {ssUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reviewer</Label>
              <Select value={reviewer} onValueChange={setReviewer}>
                <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                <SelectContent>
                  {ssUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Platform badges (read-only) */}
          {post.platform && (
            <div>
              <Label className="text-muted-foreground text-xs">Platforms</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {post.platform.split(",").map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-xs">{p.trim()}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Linked request details */}
          {linkedRequest && (
            <div className="rounded-md border border-border p-3 space-y-1 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original Request</p>
              <p className="text-sm font-medium">{linkedRequest.topic}</p>
              {linkedRequest.notes && <p className="text-xs text-muted-foreground">{linkedRequest.notes}</p>}
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">{linkedRequest.type?.replace("_", " ")}</Badge>
                <Badge variant="outline" className="text-[10px]">{linkedRequest.status}</Badge>
                {linkedRequest.priority && <Badge variant="outline" className="text-[10px]">{linkedRequest.priority}</Badge>}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => updatePost.mutate()} disabled={!title || updatePost.isPending}>
              {updatePost.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => { onOpenChange(false); navigate(`/approvals/${post.id}`); }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Full View
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
