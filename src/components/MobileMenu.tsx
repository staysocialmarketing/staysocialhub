import { useEffect, useState } from "react";
import {
  LayoutDashboard, ClipboardList, CalendarDays, CheckSquare,
  MessageSquarePlus, FolderOpen, UserCircle, Sparkles, Eye,
  Inbox, FolderKanban, ListTodo, Lightbulb, Building2,
  ShoppingCart, Users, Tag, LogOut, Brain, Wand2, Palette,
  BookOpen, Zap, FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

interface MobileMenuProps {
  onNavigate: (path: string) => void;
}

const ssMenuSections = [
  {
    label: "Menu",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Workflow", url: "/workflow", icon: ClipboardList },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
      { title: "Approvals", url: "/approvals", icon: CheckSquare },
      { title: "Requests", url: "/requests", icon: MessageSquarePlus },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Inbox", url: "/team/inbox", icon: Inbox },
      { title: "Projects", url: "/team/projects", icon: FolderKanban },
      { title: "Tasks", url: "/team/tasks", icon: ListTodo },
      { title: "Think Tank", url: "/team/think-tank", icon: Lightbulb },
    ],
  },
  {
    label: "Corporate",
    items: [
      { title: "Strategy Playbook", url: "/corporate/strategy", icon: BookOpen },
      { title: "Content Generator", url: "/client/generate", icon: Wand2 },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Clients", url: "/admin/clients", icon: Building2 },
      { title: "Team Success", url: "/admin/team", icon: Users },
      { title: "Marketplace", url: "/admin/marketplace", icon: ShoppingCart },
    ],
  },
];

const ssAdminSections = [
  {
    label: "Admin",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Meeting Notes", url: "/admin/meeting-notes", icon: FileText },
      { title: "Automations", url: "/admin/automations", icon: Zap },
      { title: "Versions", url: "/admin/versions", icon: Tag },
    ],
  },
];

const clientMenuSections = [
  {
    label: "",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Success Center", url: "/client/success", icon: Sparkles },
      { title: "Approvals", url: "/approvals", icon: CheckSquare },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
      { title: "Requests", url: "/requests", icon: MessageSquarePlus },
      { title: "My Media", url: "/content-library", icon: FolderOpen },
    ],
  },
  {
    label: "My Account",
    items: [
      { title: "My Profile", url: "/profile", icon: UserCircle },
      { title: "My Plan", url: "/plan", icon: Eye },
      { title: "What's New", url: "/whats-new", icon: Eye },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { title: "AI Interview", url: "/client/ai-interview", icon: Brain },
      { title: "Content Generator", url: "/client/generate", icon: Wand2 },
      { title: "Brand Twin", url: "/client/brand-twin", icon: Palette },
    ],
  },
];

export function MobileMenu({ onNavigate }: MobileMenuProps) {
  const { isSSAdmin, isSSTeam, isSSManager, isSSRole, profile, signOut, actualIsSSAdmin, isViewingAs, viewAsUserId, setViewAs } = useAuth();
  const location = useLocation();
  const isInternalUser = isSSAdmin || isSSTeam || isSSManager;

  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string | null; email: string; roles: string[] }>>([]);

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

  const ssUsers = allUsers.filter((u) => u.roles.some((r) => ["ss_admin", "ss_producer", "ss_ops", "ss_team"].includes(r)));
  const clientUsers = allUsers.filter((u) => u.roles.some((r) => ["client_admin", "client_assistant"].includes(r)));

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const active = location.pathname === item.url;
    return (
      <button
        key={item.url}
        onClick={() => onNavigate(item.url)}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted"
        )}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        <span>{item.title}</span>
      </button>
    );
  };

  const renderSection = (section: { label: string; items: any[] }) => (
    <div key={section.label || "main"}>
      {section.label && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
          {section.label}
        </p>
      )}
      <div className="space-y-0.5">{section.items.map(renderItem)}</div>
    </div>
  );

  return (
    <div className="overflow-y-auto max-h-[65vh] overscroll-contain -webkit-overflow-scrolling-touch">
      <div className="space-y-4 pb-4">
        {/* View As picker for Super Admin */}
        {actualIsSSAdmin && (
          <div className="px-3 pb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">View As</span>
              {isViewingAs && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">Active</Badge>
              )}
            </div>
            <Select
              value={viewAsUserId || "__self__"}
              onValueChange={(val) => setViewAs(val === "__self__" ? null : val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
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

        {isInternalUser ? (
          <>
            {ssMenuSections.map((section) => {
              let items = section.items;
              if (section.label === "Menu" && isSSTeam && !isSSAdmin) {
                items = items.filter(i => i.title !== "Approvals");
              }
              return renderSection({ ...section, items });
            })}
            {isSSAdmin && ssAdminSections.map((section) => renderSection(section))}
          </>
        ) : (
          clientMenuSections.map((section) => renderSection(section))
        )}

        {/* User info + sign out */}
        <div className="border-t pt-3 mt-2">
          {profile && (
            <div className="px-3 pb-2">
              <p className="text-sm font-medium truncate">{profile.name || profile.email}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
