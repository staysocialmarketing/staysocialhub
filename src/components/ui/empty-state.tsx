import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

function EmptyState({ icon, title, description, action, onAction, className, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-10" : "py-16",
      className
    )}>
      {icon && <span className="text-muted-foreground/30 mb-4">{icon}</span>}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs">{description}</p>}
      {action && onAction && (
        <Button variant="outline" size="sm" className="mt-5 rounded-full" onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}

export { EmptyState };
