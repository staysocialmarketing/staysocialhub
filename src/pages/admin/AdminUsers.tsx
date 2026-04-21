import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, Building2, Globe, Trash2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type AppRole = Database["public"]["Enums"]["app_role"];

const ALL_ROLES: AppRole[] = ["ss_admin", "ss_manager", "ss_team", "client_admin", "client_assistant"];

const roleLabels: Record<AppRole, string> = {
  ss_admin: "SS Admin",
  ss_manager: "SS Manager",
  ss_team: "SS Team",
  ss_producer: "SS Team",
  ss_ops: "SS Team",
  client_admin: "Client Admin",
  client_assistant: "Client Assistant",
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { isSSAdmin, isSSManager } = useAuth();
  const canManageUsers = isSSAdmin || isSSManager;
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*, user_roles(id, role), clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const pendingUsers = users.filter((u: any) => !u.user_roles || u.user_roles.length === 0);
  const assignedUsers = users.filter((u: any) => u.user_roles && u.user_roles.length > 0);

  const { data: domains = [] } = useQuery({
    queryKey: ["allowed-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_domains")
        .select("*")
        .order("domain");
      if (error) throw error;
      return data || [];
    },
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const { error } = await supabase.from("allowed_domains").insert({ domain: domain.toLowerCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
      toast.success("Domain added");
      setNewDomain("");
    },
    onError: (err: any) => toast.error(err.message?.includes("duplicate") ? "Domain already exists" : err.message || "Failed to add domain"),
  });

  const removeDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("allowed_domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
      toast.success("Domain removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove domain"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-users"] });
      toast.success("Role added");
      setAddingRoleFor(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to add role"),
  });

  const removeRole = useMutation({
    mutationFn: async ({ roleId }: { roleId: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove role"),
  });

  const updateClient = useMutation({
    mutationFn: async ({ userId, clientId }: { userId: string; clientId: string | null }) => {
      const { error } = await supabase.from("users").update({ client_id: clientId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-users"] });
      toast.success("Client updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update client"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Domain Whitelist */}
      {isSSAdmin && (
        <div className="rounded-2xl bg-card shadow-soft p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Allowed Domains</h2>
              <p className="text-xs text-muted-foreground">Only users with emails from these domains can sign in.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="max-w-xs rounded-xl"
              onKeyDown={(e) => { if (e.key === "Enter" && newDomain.trim()) addDomain.mutate(newDomain); }}
            />
            <Button size="sm" onClick={() => newDomain.trim() && addDomain.mutate(newDomain)} disabled={!newDomain.trim()}>
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {domains.map((d: any) => (
              <Badge key={d.id} variant="secondary" className="text-sm gap-1.5 pr-1.5 rounded-full">
                {d.domain}
                <button onClick={() => removeDomain.mutate(d.id)} className="ml-1 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team members and their roles.</p>
        </div>
        {!isLoading && pendingUsers.length > 0 && (
          <Badge variant="destructive" className="text-xs gap-1.5">
            <AlertCircle className="h-3 w-3" />
            {pendingUsers.length} pending
          </Badge>
        )}
      </div>

      {/* Pending users — no role assigned */}
      {!isLoading && pendingUsers.length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-500/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Pending Role Assignment</span>
            <span className="text-xs text-orange-400/60 ml-auto">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? "s" : ""} awaiting a role
            </span>
          </div>
          {pendingUsers.map((u: any) => {
            const availableRoles = ALL_ROLES;
            return (
              <div key={u.id} className="px-5 py-4 space-y-3 border-b border-orange-500/10 last:border-0 hover:bg-orange-500/5 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-sm font-semibold text-orange-400">
                      {(u.name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{u.name || u.email}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{u.email}</span>
                        {u.created_at && (
                          <>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>joined {timeAgo(u.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-orange-400/70">No role —</span>
                  {canManageUsers && addingRoleFor === u.id ? (
                    <Select onValueChange={(v) => addRole.mutate({ userId: u.id, role: v as AppRole })}>
                      <SelectTrigger className="h-7 w-40 text-xs rounded-lg border-orange-500/30">
                        <SelectValue placeholder="Assign role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    canManageUsers && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg"
                        variant="ghost"
                        onClick={() => setAddingRoleFor(u.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />Assign Role
                      </Button>
                    )
                  )}
                  {canManageUsers && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={u.client_id || "none"}
                        onValueChange={(v) => updateClient.mutate({ userId: u.id, clientId: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-7 w-44 text-xs rounded-lg">
                          <SelectValue placeholder="No client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No client</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All assigned users */}
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-2xl bg-card shadow-soft divide-y divide-border/30">
          {assignedUsers.map((u: any) => {
            const userRoles: AppRole[] = (u.user_roles || []).map((r: any) => r.role);
            const availableRoles = ALL_ROLES.filter((r) => !userRoles.includes(r));

            return (
              <div key={u.id} className="px-5 py-4 space-y-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                      {(u.name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{u.name || u.email}</h4>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(u.user_roles || []).map((r: any) => (
                    <Badge key={r.id} variant="secondary" className="text-xs gap-1 pr-1 rounded-full">
                      {roleLabels[r.role as AppRole] || r.role}
                      <button
                        onClick={() => removeRole.mutate({ roleId: r.id })}
                        className="ml-0.5 hover:text-destructive"
                        disabled={!canManageUsers}
                        style={{ visibility: canManageUsers ? "visible" : "hidden" }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {canManageUsers && addingRoleFor === u.id ? (
                    <Select onValueChange={(v) => addRole.mutate({ userId: u.id, role: v as AppRole })}>
                      <SelectTrigger className="h-7 w-36 text-xs rounded-lg">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    canManageUsers && availableRoles.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs rounded-lg" onClick={() => setAddingRoleFor(u.id)}>
                        <Plus className="h-3 w-3 mr-1" />Add Role
                      </Button>
                    )
                  )}
                </div>

                {canManageUsers && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={u.client_id || "none"}
                      onValueChange={(v) => updateClient.mutate({ userId: u.id, clientId: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-7 w-48 text-xs rounded-lg">
                        <SelectValue placeholder="No client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!canManageUsers && u.client_id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{clients.find((c) => c.id === u.client_id)?.name || "Assigned client"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
