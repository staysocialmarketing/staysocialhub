import orangeLogo from "@/assets/orange_with_black.png";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquarePlus,
  FolderOpen,
  UserCircle,
  Sparkles,
  Users,
  Building2,
  FileEdit,
  Image,
  ShoppingCart,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const superAdminItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
];

const superAdminAdminItems = [
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Profile Updates", url: "/admin/profile-updates", icon: FileEdit },
  { title: "Content", url: "/admin/content", icon: Image },
  { title: "Add-On Requests", url: "/admin/addon-requests", icon: ShoppingCart },
];

const teamItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
];

const teamAdminItems = [
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Profile Updates", url: "/admin/profile-updates", icon: FileEdit },
  { title: "Content", url: "/admin/content", icon: Image },
];

const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
  { title: "Content Library", url: "/content-library", icon: FolderOpen },
  { title: "Profile", url: "/profile", icon: UserCircle },
  { title: "Plan", url: "/plan", icon: ClipboardList },
  { title: "What's New", url: "/whats-new", icon: Sparkles },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, isSSAdmin, isSSTeam, signOut } = useAuth();

  const mainItems = isSSAdmin ? superAdminItems : isSSTeam ? teamItems : clientItems;
  const secondaryItems = isSSAdmin ? superAdminAdminItems : isSSTeam ? teamAdminItems : null;
  const secondaryLabel = isSSAdmin ? "Admin" : isSSTeam ? "Team" : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={orangeLogo} alt="Stay Social" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">Stay Social</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">HUB</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondaryItems && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{secondaryLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="px-2 py-1 mb-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.name || profile.email}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
