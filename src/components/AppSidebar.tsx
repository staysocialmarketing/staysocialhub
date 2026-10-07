import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import markLogo from "@/assets/mark-dark.svg";
import lockupLogo from "@/assets/lockup-dark.svg";
import {
  CalendarDays,
  LayoutDashboard,
  CheckSquare,
  MessageSquarePlus,
  FolderOpen,
  UserCircle,
  Sparkles,
  Users,
  Building2,
  ShoppingCart,
  BarChart3,
  LogOut,
  ClipboardList,
  Eye,
  Lightbulb,
  FolderKanban,
  ListTodo,
  Tag,
  Inbox,
  Brain,
  Wand2,
  Palette,
  ChevronDown,
  Zap,
  FileText,
  BookOpen,
  Monitor,
  Briefcase,
  Package,
  KeyRound,
  ShieldCheck,
  Coins,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// Internal menu (Corey, Oct 7 2026): nine flat items, as short as the client menu. Clients,
// Team and Admin are single pages with tabs (src/pages/hubs); every old route still works.
const menuSection = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workflow", url: "/workflow", icon: ClipboardList },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
  { title: "Inbox", url: "/team/inbox", icon: Inbox },
  { title: "Clients", url: "/clients", icon: Building2 },
  { title: "Team", url: "/team", icon: Users },
  { title: "Admin", url: "/admin", icon: Briefcase },
];

// Client menu (Corey, Oct 2026): seven items, no groups. Success Center lives on the Dashboard,
// profile, logins, plan and deliverables are tabs under Brand profile, My Media is linked from
// the Dashboard's quick actions, and the AI tools belong to the DIY app.
const clientMenu = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/pipeline", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
  { title: "Design styles", url: "/client/design-styles", icon: Palette },
  { title: "Credits", url: "/client/credits", icon: Coins },
  { title: "Brand profile", url: "/client/brand-profile", icon: UserCircle },
];

interface UserWithRole {
  id: string;
  name: string | null;
  email: string;
  roles: string[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, isSSAdmin, isSSManager, isSSTeam, actualIsSSAdmin, isViewingAs, viewAsUserId, setViewAs, signOut } = useAuth();
  const navigate = useNavigate();

  // Collapsible section state with localStorage persistence
  const [sectionState, setSectionState] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("sidebar-sections");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const isSectionOpen = (key: string) => (key in sectionState ? sectionState[key] !== false : key !== "admin"); // default open, Admin closed
  const toggleSection = (key: string) => {
    setSectionState(prev => {
      const next = { ...prev, [key]: !isSectionOpen(key) };
      localStorage.setItem("sidebar-sections", JSON.stringify(next));
      return next;
    });
  };

  const canViewAs = actualIsSSAdmin || isSSTeam || isSSManager;

  const { data: allUsers = [] } = useQuery<UserWithRole[]>({
    queryKey: ["sidebar-users"],
    enabled: canViewAs,
    queryFn: async () => {
      const { data: users } = await supabase.from("users").select("id, name, email").is("retired_at", null);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (!users || !roles) return [];
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      return users.map((u) => ({ ...u, roles: roleMap[u.id] || [] }));
    },
  });

  const isInternalUser = isSSAdmin || isSSTeam || isSSManager;

  const ssUsers = allUsers.filter((u) => u.roles.some((r) => ["ss_admin", "ss_manager", "ss_producer", "ss_ops", "ss_team"].includes(r)));
  const clientUsers = allUsers.filter((u) => u.roles.some((r) => ["client_admin", "client_assistant"].includes(r)));
  const pendingCount = allUsers.filter((u) => u.roles.length === 0).length;

  const renderMenuItems = (items: typeof menuSection, badges?: Record<string, number>) => (
    <SidebarMenu>
      {items.map((item) => {
        const badge = badges?.[item.title];
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end={item.url === "/team" || item.url === "/admin" || item.url === "/clients"}
                className="hover:bg-sidebar-accent/50 rounded-xl transition-colors"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between gap-1 min-w-0">
                    <span>{item.title}</span>
                    {badge ? (
                      <span className="text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {collapsed ? (
          <img src={markLogo} alt="Stay Social" className="h-7 w-7 shrink-0 object-contain" />
        ) : (
          <div className="flex flex-col gap-1.5 min-w-0">
            <img src={lockupLogo} alt="Stay Social" className="h-7 w-auto self-start object-contain" />
            <span className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-widest truncate pl-0.5">Client HUB</span>
          </div>
        )}
      </SidebarHeader>

      {canViewAs && !collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            <span className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">View As</span>
            {isViewingAs && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                Active
              </Badge>
            )}
          </div>
          <Select
            value={viewAsUserId || "__self__"}
            onValueChange={(val) => setViewAs(val === "__self__" ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs bg-transparent border-sidebar-border/50 text-sidebar-foreground rounded-xl focus:bg-background focus:text-foreground">
              <SelectValue placeholder="My View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__self__">My View</SelectItem>
              {actualIsSSAdmin && ssUsers.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-xs">Team</SelectLabel>
                  {ssUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {clientUsers.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-xs">Clients</SelectLabel>
                  {clientUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <SidebarSeparator className="opacity-50" />

      <SidebarContent>
        {isInternalUser ? (
          <SidebarGroup>
            <SidebarGroupContent>{renderMenuItems(
              menuSection,
              (isSSAdmin || isSSManager) && pendingCount > 0 ? { Admin: pendingCount } : undefined
            )}</SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupContent>{renderMenuItems(clientMenu)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="px-2 py-2 mb-1 bg-sidebar-accent/30 rounded-xl">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile.name || profile.email}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
