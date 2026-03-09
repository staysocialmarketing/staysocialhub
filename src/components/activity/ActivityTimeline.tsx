import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MessageSquarePlus,
  CheckSquare,
  FolderOpen,
  Megaphone,
  Mail,
  Clock,
  Calendar,
  Send,
  RefreshCw,
  ListChecks,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  manual_note: FileText,
  request_created: MessageSquarePlus,
  request_status_changed: RefreshCw,
  approval_completed: CheckSquare,
  internal_review_completed: ListChecks,
  client_changes_requested: RefreshCw,
  task_completed: CheckSquare,
  media_uploaded: FolderOpen,
  campaign_launched: Megaphone,
  content_scheduled: Calendar,
  content_published: CheckSquare,
  post_published: CheckSquare,
  email_scheduled: Clock,
  email_sent: Send,
};

const labelMap: Record<string, string> = {
  manual_note: "Note",
  request_created: "Request",
  request_status_changed: "Status Change",
  approval_completed: "Approval",
  internal_review_completed: "Internal Review",
  client_changes_requested: "Changes Requested",
  task_completed: "Task Complete",
  media_uploaded: "Media",
  campaign_launched: "Campaign",
  content_scheduled: "Scheduled",
  content_published: "Published",
  post_published: "Published",
  email_scheduled: "Email Scheduled",
  email_sent: "Email Sent",
};

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  visible_to_client: boolean;
}

interface Props {
  activities: Activity[];
  isSSRole: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ActivityTimeline({ activities, isSSRole, onLoadMore, hasMore }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No recent activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const Icon = iconMap[a.activity_type] || FileText;
        return (
          <div key={a.id} className="flex gap-3 items-start">
            <div className="text-xs text-muted-foreground w-16 pt-0.5 shrink-0 text-right">
              {formatDistanceToNow(new Date(a.created_at), { addSuffix: false })}
            </div>
            <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{a.title}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {labelMap[a.activity_type] || a.activity_type}
                </Badge>
                {isSSRole && !a.visible_to_client && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Internal</Badge>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
              )}
            </div>
          </div>
        );
      })}
      {hasMore && onLoadMore && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onLoadMore}>
          Load More
        </Button>
      )}
    </div>
  );
}
