import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, Building2, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ALL_ROLES: AppRole[] = ["ss_admin", "ss_team", "client_admin", "client_assistant"];

const roleLabels: Record<AppRole, string> = {
  ss_admin: "SS Admin",
  ss_team: "SS Team",
  ss_producer: "SS Team",
  ss_ops: "SS Team",
  client_admin: "Client Admin",
  client_assistant: "Client Assistant",
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { isSSAdmin } = useAuth();
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
      toast.success("Client updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update client"),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Users</h2>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-3">
          {users.map((u: any) => {
            const userRoles: AppRole[] = (u.user_roles || []).map((r: any) => r.role);
            const availableRoles = ALL_ROLES.filter((r) => !userRoles.includes(r));

            return (
              <Card key={u.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium text-foreground">{u.name || u.email}</h4>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(u.user_roles || []).map((r: any) => (
                      <Badge key={r.id} variant="secondary" className="text-xs gap-1 pr-1">
                        {roleLabels[r.role as AppRole] || r.role}
                        <button
                          onClick={() => removeRole.mutate({ roleId: r.id })}
                          className="ml-0.5 hover:text-destructive"
                          disabled={!isSSAdmin}
                          style={{ visibility: isSSAdmin ? "visible" : "hidden" }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {isSSAdmin && addingRoleFor === u.id ? (
                      <Select onValueChange={(v) => addRole.mutate({ userId: u.id, role: v as AppRole })}>
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      isSSAdmin && availableRoles.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAddingRoleFor(u.id)}>
                          <Plus className="h-3 w-3 mr-1" />Add Role
                        </Button>
                      )
                    )}
                  </div>

                  {isSSAdmin && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={u.client_id || "none"}
                        onValueChange={(v) => updateClient.mutate({ userId: u.id, clientId: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-7 w-48 text-xs">
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
                  {!isSSAdmin && u.client_id && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{clients.find((c) => c.id === u.client_id)?.name || "Assigned client"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
