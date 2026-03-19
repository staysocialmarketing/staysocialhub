import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "default" | "destructive";
}

function StatCard({ label, value, subtitle, icon, accent = "default", className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "card-interactive rounded-2xl p-5",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground/60 group-hover:text-primary transition-colors">{icon}</span>}
      </div>
      <div className={cn(
        "text-3xl font-bold tracking-tight",
        accent === "destructive" ? "text-destructive" : "text-foreground"
      )}>
        {value}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
    </div>
  );
}

export { StatCard };
