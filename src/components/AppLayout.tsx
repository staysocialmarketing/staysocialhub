import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { GlobalCaptureButton } from "@/components/GlobalCaptureButton";

export function AppLayout() {
  const { profile, isViewingAs, setViewAs } = useAuth();

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {isViewingAs && profile && (
            <div className="h-8 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-medium shrink-0">
              <span>Viewing as: {profile.name || profile.email}</span>
              <button
                onClick={() => setViewAs(null)}
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
              >
                <X className="h-3 w-3" /> Exit
              </button>
            </div>
          )}
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2 flex-1">
              <h1 className="text-lg font-semibold text-foreground">Stay Social <span className="text-primary">HUB</span></h1>
            </div>
            {profile && <NotificationBell />}
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <GlobalCaptureButton />
        </div>
      </div>
    </SidebarProvider>
  );
}
