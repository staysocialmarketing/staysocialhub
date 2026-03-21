import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Outlet, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { GlobalCaptureButton } from "@/components/GlobalCaptureButton";
import { HubAssistant } from "@/components/HubAssistant";
import { CommandPalette } from "@/components/CommandPalette";
import { VersionHistoryDialog } from "@/components/VersionHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const { profile, isViewingAs, setViewAs, isSSRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [versionLabel, setVersionLabel] = useState("");
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  const fetchLatestVersion = () => {
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
  };

  useEffect(() => {
    fetchLatestVersion();

    const channel = supabase
      .channel("version-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_versions" },
        () => fetchLatestVersion()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSSRole]);

  return (
    <SidebarProvider>
      <div className="h-dvh flex w-full overflow-hidden">
        {/* Desktop sidebar only */}
        {!isMobile && <AppSidebar />}
        
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
          
          <header className="h-14 flex items-center border-b border-border/50 bg-background px-4 shrink-0">
            {!isMobile && <SidebarTrigger className="mr-4" />}
            <div className="flex items-center gap-2 flex-1 min-w-0 shrink-0">
              <h1 className="text-lg font-bold text-foreground whitespace-nowrap tracking-tight">
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
                  className="text-[10px] text-muted-foreground/60 font-medium hover:text-primary transition-colors cursor-pointer bg-muted/50 px-1.5 py-0.5 rounded-md"
                >
                  {versionLabel}
                </button>
              )}
            </div>
            {profile && <CommandPalette />}
            {profile && <NotificationBell />}
          </header>
          
          <main className={`flex-1 overflow-auto ${isMobile ? "pb-16" : ""}`}>
            <Outlet />
          </main>
          
          <GlobalCaptureButton />
          <HubAssistant />
      </div>
      
      {/* Mobile bottom tab bar */}
      {isMobile && <BottomTabBar />}
      
      <VersionHistoryDialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen} />
    </SidebarProvider>
  );
}
