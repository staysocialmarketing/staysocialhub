import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CheckSquare, MessageSquarePlus, CalendarDays, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { MobileMenu } from "@/components/MobileMenu";

const ssTabItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Approvals", icon: CheckSquare, path: "/approvals" },
  { label: "Requests", icon: MessageSquarePlus, path: "/requests" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "More", icon: Menu, path: "__menu__" },
];

const clientTabItems = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Pipeline", icon: CheckSquare, path: "/pipeline" },
  { label: "Requests", icon: MessageSquarePlus, path: "/requests" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "More", icon: Menu, path: "__menu__" },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSSRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = isSSRole ? ssTabItems : clientTabItems;

  const isActive = (path: string) => {
    if (path === "__menu__") return false;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50">
      <nav className="flex items-stretch justify-around h-16 px-1 safe-bottom">
        {items.map((item) => {
          if (item.path === "__menu__") {
            return (
              <Sheet key="menu" open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 text-muted-foreground/70 transition-colors active:scale-95">
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl px-4 pt-3 pb-8 max-h-[80vh] overflow-hidden">
                  <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
                  <MobileMenu onNavigate={(path) => { navigate(path); setMenuOpen(false); }} />
                </SheetContent>
              </Sheet>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 transition-colors active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground/70"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
