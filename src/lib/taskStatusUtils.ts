export const taskStatusColors: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  todo: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  waiting: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  review: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  complete: "bg-green-500/15 text-green-700 border-green-500/20",
};

export const taskStatusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  review: "Review",
  complete: "Complete",
};

export const taskStatusColumns = ["backlog", "todo", "in_progress", "waiting", "review", "complete"] as const;
