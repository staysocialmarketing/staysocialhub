import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserEntry {
  id: string;
  name: string | null;
  email: string;
  client_id: string | null;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  ss_admin: "SS Admin",
  ss_manager: "Manager",
  ss_producer: "Producer",
  ss_ops: "Ops",
  ss_team: "SS Team",
  client_admin: "Client Admin",
  client_assistant: "Assistant",
};

const ROLE_COLORS: Record<AppRole, string> = {
  ss_admin: "bg-violet-500/10 text-violet-600 border-violet-200",
  ss_manager: "bg-purple-500/10 text-purple-600 border-purple-200",
  ss_producer: "bg-blue-500/10 text-blue-600 border-blue-200",
  ss_ops: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  ss_team: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  client_admin: "bg-primary/10 text-primary border-primary/20",
  client_assistant: "bg-primary/5 text-primary/80 border-primary/15",
};

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function ViewAsDropdown() {
  const { actualIsSSAdmin, isViewingAs, viewAsUserId, setViewAs, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["view-as-users"],
    queryFn: async () => {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, email, client_id")
        .order("name");

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (!usersData) return [] as UserEntry[];

      const roleMap: Record<string, AppRole[]> = {};
      (rolesData || []).forEach(({ user_id, role }) => {
        if (!roleMap[user_id]) roleMap[user_id] = [];
        roleMap[user_id].push(role);
      });

      return usersData.map((u) => ({
        ...u,
        roles: roleMap[u.id] || [],
      })) as UserEntry[];
    },
    enabled: actualIsSSAdmin && open,
    staleTime: 30_000,
  });

  if (!actualIsSSAdmin) return null;

  const ssUsers = allUsers.filter((u) =>
    u.roles.some((r) => ["ss_admin", "ss_manager", "ss_producer", "ss_ops", "ss_team"].includes(r))
  );
  const clientUsers = allUsers.filter((u) =>
    u.roles.some((r) => ["client_admin", "client_assistant"].includes(r)) &&
    !u.roles.some((r) => ["ss_admin", "ss_manager", "ss_producer", "ss_ops", "ss_team"].includes(r))
  );

  const viewingAsUser = isViewingAs
    ? allUsers.find((u) => u.id === viewAsUserId)
    : null;

  const handleSelect = (userId: string) => {
    if (userId === viewAsUserId) {
      setViewAs(null);
    } else {
      setViewAs(userId);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            isViewingAs
              ? "h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
              : "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          }
          title={isViewingAs ? `Viewing as ${viewingAsUser?.name || viewingAsUser?.email}` : "View as user"}
        >
          <Users className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search by name, email, or role…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading users…" : "No users found."}
            </CommandEmpty>

            {/* Active impersonation — show exit at top */}
            {isViewingAs && viewingAsUser && (
              <>
                <CommandGroup heading="Currently Viewing As">
                  <CommandItem
                    onSelect={() => { setViewAs(null); setOpen(false); }}
                    className="gap-3 py-2.5 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {initials(viewingAsUser.name, viewingAsUser.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{viewingAsUser.name || viewingAsUser.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{viewingAsUser.email}</p>
                    </div>
                    <span className="text-[11px] text-amber-600 font-medium shrink-0">Exit</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {ssUsers.length > 0 && (
              <CommandGroup heading="SS Team">
                {ssUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isActive={viewAsUserId === u.id}
                    isSelf={u.id === profile?.id}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {ssUsers.length > 0 && clientUsers.length > 0 && <CommandSeparator />}

            {clientUsers.length > 0 && (
              <CommandGroup heading="Clients">
                {clientUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isActive={viewAsUserId === u.id}
                    isSelf={false}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function UserRow({
  user,
  isActive,
  isSelf,
  onSelect,
}: {
  user: UserEntry;
  isActive: boolean;
  isSelf: boolean;
  onSelect: (id: string) => void;
}) {
  const primaryRole = user.roles[0];

  return (
    <CommandItem
      value={`${user.name ?? ""} ${user.email} ${user.roles.join(" ")}`}
      onSelect={() => !isSelf && onSelect(user.id)}
      disabled={isSelf}
      className="gap-3 py-2.5 cursor-pointer data-[disabled=true]:opacity-40"
    >
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          isActive
            ? "bg-amber-500/20 text-amber-600"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {initials(user.name, user.email)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.name || user.email}
          {isSelf && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
      </div>
      {primaryRole && (
        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 border ${ROLE_COLORS[primaryRole]}`}
        >
          {ROLE_LABELS[primaryRole]}
        </Badge>
      )}
    </CommandItem>
  );
}
