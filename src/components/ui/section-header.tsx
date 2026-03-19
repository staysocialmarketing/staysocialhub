import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  action?: string;
  onAction?: () => void;
  className?: string;
}

function SectionHeader({ title, icon, action, onAction, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {action && onAction && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

export { SectionHeader };
