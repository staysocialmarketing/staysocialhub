
import { useEffect, useState } from "react";
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
  Image,
  ShoppingCart,
  LogOut,
  ClipboardList,
  Eye,
  Lightbulb,
  FolderKanban,
  ListTodo,
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

// ─── Sections for admin/team views ───────────────────────────────────────────
const menuSection = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workflow", url: "/workflow", icon: ClipboardList },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
];

const teamSection = [
  { title: "Projects", url: "/team/projects", icon: FolderKanban },
  { title: "Tasks", url: "/team/tasks", icon: ListTodo },
  { title: "Think Tank", url: "/team/think-tank", icon: Lightbulb },
];

const adminSection = [
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Media Library", url: "/admin/media", icon: Image },
  { title: "Marketplace", url: "/admin/marketplace", icon: ShoppingCart },
  { title: "Users", url: "/admin/users", icon: Users },
];

// ─── Client nav ──────────────────────────────────────────────────────────────
const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
  { title: "My Media", url: "/content-library", icon: FolderOpen },
  { title: "My Profile", url: "/profile", icon: UserCircle },
  { title: "My Plan", url: "/plan", icon: ClipboardList },
  { title: "What's New", url: "/whats-new", icon: Sparkles },
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
  const { profile, isSSAdmin, isSSTeam, actualIsSSAdmin, isViewingAs, viewAsUserId, setViewAs, signOut } = useAuth();

  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);

  useEffect(() => {
    if (!actualIsSSAdmin) return;
    const fetchUsers = async () => {
      const { data: users } = await supabase.from("users").select("id, name, email");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (users && roles) {
        const roleMap: Record<string, string[]> = {};
        roles.forEach((r) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });
        setAllUsers(users.map((u) => ({ ...u, roles: roleMap[u.id] || [] })));
      }
    };
    fetchUsers();
  }, [actualIsSSAdmin]);

  const isInternalUser = isSSAdmin || isSSTeam;
  const visibleAdminItems = isSSAdmin ? adminSection : adminSection.filter((i) => i.title !== "Users");

  const ssUsers = allUsers.filter((u) => u.roles.some((r) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r)));
  const clientUsers = allUsers.filter((u) => u.roles.some((r) => ["client_admin", "client_assistant"].includes(r)));

  const renderMenuItems = (items: typeof menuSection) => (
    <SidebarMenu>
      {items.map((item) => (
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={orangeLogo} alt="Stay Social" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">Stay Social</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">Client HUB</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {actualIsSSAdmin && !collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye className="h-3.5 w-3.5 text-sidebar-foreground/50" />
            <span className="text-xs font-medium text-sidebar-foreground/50">View As</span>
            {isViewingAs && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto bg-primary/15 text-primary border-primary/20">
                Active
              </Badge>
            )}
          </div>
          <Select
            value={viewAsUserId || "__self__"}
            onValueChange={(val) => setViewAs(val === "__self__" ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs bg-transparent border-sidebar-border text-sidebar-foreground focus:bg-background focus:text-foreground">
              <SelectValue placeholder="My View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__self__">My View (Super Admin)</SelectItem>
              {ssUsers.length > 0 && (
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

      <SidebarSeparator />

      <SidebarContent>
        {isInternalUser ? (
          <>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
              <SidebarGroupContent>{renderMenuItems(menuSection)}</SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Team</SidebarGroupLabel>}
              <SidebarGroupContent>{renderMenuItems(teamSection)}</SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Admin</SidebarGroupLabel>}
              <SidebarGroupContent>{renderMenuItems(visibleAdminItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>{renderMenuItems(clientItems)}</SidebarGroupContent>
          </SidebarGroup>
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
