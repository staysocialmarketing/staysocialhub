import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Tag, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface PlatformVersion {
  id: string;
  major_version: number;
  minor_version: number;
  title: string | null;
  notes: string | null;
  published_by_user_id: string | null;
  published_at: string | null;
  visible_to_clients: boolean;
  created_at: string;
}

export default function AdminVersions() {
  const { user, isSSAdmin } = useAuth();
  const [versions, setVersions] = useState<PlatformVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [majorVersion, setMajorVersion] = useState(1);
  const [minorVersion, setMinorVersion] = useState(0);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [visibleToClients, setVisibleToClients] = useState(false);

  const fetchVersions = async () => {
    const { data } = await supabase
      .from("platform_versions")
      .select("*")
      .order("published_at", { ascending: false });
    setVersions((data as PlatformVersion[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchVersions(); }, []);

  const handleNewRelease = () => {
    const latest = versions[0];
    if (latest) {
      setMajorVersion(latest.major_version);
      setMinorVersion(latest.minor_version + 1);
    }
    setTitle("");
    setNotes("");
    setVisibleToClients(false);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (v: PlatformVersion) => {
    setMajorVersion(v.major_version);
    setMinorVersion(v.minor_version);
    setTitle(v.title || "");
    setNotes(v.notes || "");
    setVisibleToClients(v.visible_to_clients);
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleDelete = async (v: PlatformVersion) => {
    if (!confirm(`Delete V${v.major_version}.${v.minor_version}?`)) return;
    const { error } = await supabase.from("platform_versions").delete().eq("id", v.id);
    if (error) { toast.error("Failed to delete version"); return; }
    toast.success("Version deleted");
    fetchVersions();
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from("platform_versions").update({
        major_version: majorVersion,
        minor_version: minorVersion,
        title: title.trim(),
        notes: notes.trim() || null,
        visible_to_clients: visibleToClients,
      }).eq("id", editingId);
      setSaving(false);
      if (error) { toast.error("Failed to update version"); return; }
      toast.success(`V${majorVersion}.${minorVersion} updated`);
    } else {
      const { error } = await supabase.from("platform_versions").insert({
        major_version: majorVersion,
        minor_version: minorVersion,
        title: title.trim(),
        notes: notes.trim() || null,
        published_by_user_id: user?.id || null,
        visible_to_clients: visibleToClients,
      } as any);
      setSaving(false);
      if (error) { toast.error("Failed to publish version"); return; }
      toast.success(`V${majorVersion}.${minorVersion} published`);
    }

    setShowForm(false);
    setEditingId(null);
    fetchVersions();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Platform Versions</h2>
        </div>
        {!showForm && (
          <Button onClick={handleNewRelease} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Release
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-lg">{editingId ? "Edit Version" : "Publish New Version"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Major Version</Label>
                <Input
                  type="number"
                  min={1}
                  value={majorVersion}
                  onChange={e => setMajorVersion(Number(e.target.value))}
                  disabled={!isSSAdmin}
                />
                {!isSSAdmin && <p className="text-xs text-muted-foreground mt-1">Only Super Admin can change major version</p>}
              </div>
              <div>
                <Label>Minor Version</Label>
                <Input
                  type="number"
                  min={0}
                  value={minorVersion}
                  onChange={e => setMinorVersion(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Workflow improvements" />
            </div>
            <div>
              <Label>Release Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Summary of changes..." rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={visibleToClients} onCheckedChange={setVisibleToClients} />
              <Label className="cursor-pointer">Visible to clients</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? `Update V${majorVersion}.${minorVersion}` : `Publish V${majorVersion}.${minorVersion}`}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : versions.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No versions published yet.</p>
      ) : (
        <div className="space-y-4">
          {versions.map((v, i) => (
            <Card key={v.id} className={i === 0 ? "border-primary/30" : ""}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">V{v.major_version}.{v.minor_version}</span>
                      {i === 0 && <Badge className="bg-primary/10 text-primary text-[10px]">Current</Badge>}
                      {v.visible_to_clients ? (
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    {v.title && <h3 className="font-medium text-foreground">{v.title}</h3>}
                    {v.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground mr-2">
                      {v.published_at ? format(new Date(v.published_at), "MMM d, yyyy") : "—"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(v)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
