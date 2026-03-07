import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      {action && onAction && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1" onClick={onAction}>
          {action} <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export { SectionHeader };
