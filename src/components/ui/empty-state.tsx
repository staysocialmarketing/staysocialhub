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
      compact ? "py-8" : "py-16",
      className
    )}>
      {icon && <span className="text-muted-foreground/40 mb-3">{icon}</span>}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">{description}</p>}
      {action && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}

export { EmptyState };
