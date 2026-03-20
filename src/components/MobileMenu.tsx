import {
  LayoutDashboard, ClipboardList, CalendarDays, CheckSquare,
  MessageSquarePlus, FolderOpen, UserCircle, Sparkles, Eye,
  Inbox, FolderKanban, ListTodo, Lightbulb, Building2,
  ShoppingCart, Users, Tag, LogOut, Brain, Wand2, Palette,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

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
    label: "Admin",
    items: [
      { title: "Clients", url: "/admin/clients", icon: Building2 },
      { title: "Marketplace", url: "/admin/marketplace", icon: ShoppingCart },
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Team", url: "/admin/team", icon: Users },
      { title: "Versions", url: "/admin/versions", icon: Tag },
    ],
  },
];

const clientMenuSections = [
  {
    label: "My Content",
    items: [
      { title: "Success Center", url: "/client/success", icon: Sparkles },
      { title: "My Media", url: "/content-library", icon: FolderOpen },
      { title: "My Plan", url: "/plan", icon: Eye },
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
  {
    label: "Account",
    items: [
      { title: "My Profile", url: "/profile", icon: UserCircle },
      { title: "What's New", url: "/whats-new", icon: Eye },
    ],
  },
];

export function MobileMenu({ onNavigate }: MobileMenuProps) {
  const { isSSAdmin, isSSTeam, isSSRole, profile, signOut } = useAuth();
  const location = useLocation();
  const isInternalUser = isSSAdmin || isSSTeam;

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
    <div key={section.label}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
        {section.label}
      </p>
      <div className="space-y-0.5">{section.items.map(renderItem)}</div>
    </div>
  );

  return (
    <div className="overflow-y-auto max-h-[65vh] overscroll-contain -webkit-overflow-scrolling-touch">
      <div className="space-y-4 pb-4">
        {isInternalUser ? (
          ssMenuSections.map((section) => {
            let items = section.items;
            if (section.label === "Admin" && !isSSAdmin) {
              items = items.filter(i => i.title !== "Users" && i.title !== "Versions");
            }
            if (section.label === "Menu" && isSSTeam && !isSSAdmin) {
              items = items.filter(i => i.title !== "Approvals");
            }
            return renderSection({ ...section, items });
          })
        ) : (
          clientMenuSections.map((section) => {
            // Hide AI Tools for managed clients (Layer 2) — show for all for now
            // TODO: gate on DIY flag when Layer 3 roles are added
            return renderSection(section);
          })
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
