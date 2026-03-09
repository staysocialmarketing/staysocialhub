import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { GlobalCaptureButton } from "@/components/GlobalCaptureButton";
import { GlobalSearch } from "@/components/GlobalSearch";
import { VersionHistoryDialog } from "@/components/VersionHistoryDialog";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout() {
  const { profile, isViewingAs, setViewAs, isSSRole } = useAuth();
  const navigate = useNavigate();
  const [versionLabel, setVersionLabel] = useState("");
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  useEffect(() => {
    let query = supabase
      .from("platform_versions")
      .select("major_version, minor_version")
      .order("published_at", { ascending: false })
      .limit(1);

    if (!isSSRole) {
      query = query.eq("visible_to_clients", true);
    }

    query.then(({ data }) => {
      if (data && data.length > 0) {
        const v = data[0] as any;
        setVersionLabel(`V${v.major_version}.${v.minor_version}`);
      }
    });
  }, [isSSRole]);

  return (
    <SidebarProvider>
      <div className="h-dvh flex w-full overflow-hidden">
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
              <h1 className="text-lg font-semibold text-foreground">
                Stay Social <span className="text-primary">HUB</span>
              </h1>
              {versionLabel && (
                <button
                  onClick={() => {
                    if (isSSRole) {
                      setVersionDialogOpen(true);
                    } else {
                      navigate("/whats-new#release-notes");
                    }
                  }}
                  className="text-xs text-muted-foreground font-medium hover:text-primary transition-colors cursor-pointer"
                >
                  {versionLabel}
                </button>
              )}
            </div>
            {isSSRole && <GlobalSearch />}
            {profile && <NotificationBell />}
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <GlobalCaptureButton />
        </div>
      </div>
      <VersionHistoryDialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen} />
    </SidebarProvider>
  );
}
