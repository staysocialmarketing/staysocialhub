import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Award, Save, X, Pencil } from "lucide-react";

interface RoleConfig {
  id: string;
  user_name: string;
  title: string | null;
  responsibilities: string[];
  mission: string | null;
  sort_order: number;
}

export default function TeamRoles() {
  const { isSSAdmin } = useAuth();
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RoleConfig>>({});

  const fetchRoles = async () => {
    const { data } = await supabase.from("team_roles_config").select("*").order("sort_order");
    if (data) setRoles(data.map(r => ({ ...r, responsibilities: (r.responsibilities as string[]) || [] })));
  };

  useEffect(() => { fetchRoles(); }, []);

  const startEdit = (role: RoleConfig) => {
    setEditingId(role.id);
    setEditForm({ ...role, responsibilities: [...role.responsibilities] });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    const { error } = await supabase.from("team_roles_config").update({
      title: editForm.title,
      responsibilities: editForm.responsibilities as any,
      mission: editForm.mission,
    }).eq("id", editingId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    setEditingId(null);
    fetchRoles();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Roles & Responsibilities</h1>
        <p className="text-sm text-muted-foreground mt-1">Team structure, missions, and ownership areas.</p>
      </div>

      <div className="space-y-4">
        {roles.map(role => {
          const isEditing = editingId === role.id;
          return (
            <div key={role.id} className="rounded-xl bg-card border border-border/40 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{role.user_name}</h3>
                  {isEditing ? (
                    <Input
                      value={editForm.title || ""}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="mt-1 text-sm"
                      placeholder="Title"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{role.title}</p>
                  )}
                </div>
                {isSSAdmin && !isEditing && (
                  <Button variant="ghost" size="icon" onClick={() => startEdit(role)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsibilities</span>
                {isEditing ? (
                  <Textarea
                    value={(editForm.responsibilities || []).join("\n")}
                    onChange={e => setEditForm(f => ({ ...f, responsibilities: e.target.value.split("\n") }))}
                    className="mt-1 text-sm"
                    rows={4}
                    placeholder="One per line"
                  />
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {role.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span> {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mission</span>
                {isEditing ? (
                  <Textarea
                    value={editForm.mission || ""}
                    onChange={e => setEditForm(f => ({ ...f, mission: e.target.value }))}
                    className="mt-1 text-sm"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-foreground/80 mt-1 italic">"{role.mission}"</p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveEdit}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
