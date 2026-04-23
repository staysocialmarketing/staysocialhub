import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import orangeLogo from "@/assets/orange_with_black.png";
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
  Kanban,
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

const menuSection = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workflow", url: "/workflow", icon: ClipboardList },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
];

const teamSection = [
  { title: "Inbox", url: "/team/inbox", icon: Inbox },
  { title: "Projects", url: "/team/projects", icon: FolderKanban },
  { title: "Tasks", url: "/team/tasks", icon: ListTodo },
  { title: "Think Tank", url: "/team/think-tank", icon: Lightbulb },
];

const corporateSection = [
  { title: "Strategy Playbook", url: "/corporate/strategy", icon: BookOpen },
  { title: "Content Generator", url: "/client/generate", icon: Wand2 },
];

const manageSection = [
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Team Success", url: "/admin/team", icon: Users },
  { title: "Marketplace", url: "/admin/marketplace", icon: ShoppingCart },
];

const adminSection = [
  { title: "Workspace", url: "/admin/workspace", icon: Briefcase },
  { title: "Agent Office", url: "/agent-office-v2", icon: Monitor },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Plans", url: "/admin/plans", icon: ClipboardList },
  { title: "Meeting Notes", url: "/admin/meeting-notes", icon: FileText },
  { title: "Automations", url: "/admin/automations", icon: Zap },
  { title: "Versions", url: "/admin/versions", icon: Tag },
];

const clientContentSection = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Success Center", url: "/client/success", icon: Sparkles },
  { title: "Content Pipeline", url: "/client/pipeline", icon: Kanban },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Requests", url: "/requests", icon: MessageSquarePlus },
  { title: "My Media", url: "/content-library", icon: FolderOpen },
];

const clientAISection = [
  { title: "AI Interview", url: "/client/ai-interview", icon: Brain },
  { title: "Content Generator", url: "/client/generate", icon: Wand2 },
  { title: "Brand Twin", url: "/client/brand-twin", icon: Palette },
];

const clientAccountSection = [
  { title: "My Profile", url: "/profile", icon: UserCircle },
  { title: "My Plan", url: "/plan", icon: ClipboardList },
  { title: "Marketplace", url: "/whats-new", icon: Eye },
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

  const isSectionOpen = (key: string) => sectionState[key] !== false; // default open
  const toggleSection = (key: string) => {
    setSectionState(prev => {
      const next = { ...prev, [key]: !isSectionOpen(key) };
      localStorage.setItem("sidebar-sections", JSON.stringify(next));
      return next;
    });
  };

  const { data: allUsers = [] } = useQuery<UserWithRole[]>({
    queryKey: ["sidebar-users"],
    enabled: actualIsSSAdmin,
    queryFn: async () => {
      const { data: users } = await supabase.from("users").select("id, name, email");
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
                className="hover:bg-sidebar-accent/50 rounded-xl transition-colors"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between gap-1 min-w-0">
                    <span>{item.title}</span>
                    {badge ? (
                      <span className="text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
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
        <div className="flex items-center gap-2.5">
          <img
            src={orangeLogo}
            alt="Stay Social"
            className={cn(
              "rounded-xl shrink-0",
              collapsed ? "h-8 w-8 object-cover" : "h-8 w-auto object-contain"
            )}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight truncate">Stay Social</span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-widest truncate">Client HUB</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {actualIsSSAdmin && !collapsed && (
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

      <SidebarSeparator className="opacity-50" />

      <SidebarContent>
        {isInternalUser ? (
          <>
            <Collapsible open={isSectionOpen("menu")} onOpenChange={() => toggleSection("menu")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      Menu
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("menu") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(
                    menuSection
                  )}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarSeparator className="opacity-30" />

            <Collapsible open={isSectionOpen("team")} onOpenChange={() => toggleSection("team")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      Team
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("team") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(teamSection)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarSeparator className="opacity-30" />

            <Collapsible open={isSectionOpen("corporate")} onOpenChange={() => toggleSection("corporate")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      Corporate
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("corporate") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(corporateSection)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarSeparator className="opacity-30" />

            <Collapsible open={isSectionOpen("manage")} onOpenChange={() => toggleSection("manage")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      Manage
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("manage") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(manageSection)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {isInternalUser && (
              <>
                <SidebarSeparator className="opacity-30" />

                <Collapsible open={isSectionOpen("admin")} onOpenChange={() => toggleSection("admin")}>
                  <SidebarGroup>
                    {!collapsed && (
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                          Admin
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("admin") && "rotate-180")} />
                        </SidebarGroupLabel>
                      </CollapsibleTrigger>
                    )}
                    <CollapsibleContent>
                      <SidebarGroupContent>{renderMenuItems(
                        adminSection.filter(i => {
                          if (i.title === "Workspace") return isSSAdmin;
                          if (i.title === "Users") return isSSAdmin || isSSManager;
                          if (i.title === "Plans" || i.title === "Versions") return isSSAdmin;
                          if (i.title === "Agent Office v2") return actualIsSSAdmin;
                          return true;
                        }),
                        (isSSAdmin || isSSManager) && pendingCount > 0 ? { Users: pendingCount } : undefined
                      )}</SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              </>
            )}
          </>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupContent>{renderMenuItems(clientContentSection)}</SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="opacity-30" />

            <Collapsible open={isSectionOpen("ai-tools")} onOpenChange={() => toggleSection("ai-tools")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      AI Tools
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("ai-tools") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(clientAISection)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarSeparator className="opacity-30" />

            <Collapsible open={isSectionOpen("my-account")} onOpenChange={() => toggleSection("my-account")}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 cursor-pointer flex items-center justify-between w-full">
                      My Account
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSectionOpen("my-account") && "rotate-180")} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>{renderMenuItems(clientAccountSection)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
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
