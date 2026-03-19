import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Clock, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import NotificationPreferences from "@/components/NotificationPreferences";

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "Twitter/X", "YouTube"];
const TABS = [
  { value: "business", label: "Business Info" },
  { value: "voice", label: "Brand Voice" },
  { value: "offers", label: "Offers" },
  { value: "prefs", label: "Content Prefs" },
  { value: "assets", label: "Assets" },
];

export default function Profile() {
  const { profile, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("business");

  const { data: clientProfile, isLoading } = useQuery({
    queryKey: ["client-profile", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase
        .from("client_profile")
        .select("*")
        .eq("client_id", profile.client_id)
        .single();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const { data: pendingUpdate } = useQuery({
    queryKey: ["pending-profile-update", profile?.client_id],
    queryFn: async () => {
      if (!profile?.client_id) return null;
      const { data } = await supabase
        .from("profile_update_requests")
        .select("*")
        .eq("client_id", profile.client_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.client_id,
  });

  const [draft, setDraft] = useState<any>(null);

  const initDraft = () => {
    if (clientProfile) {
      setDraft({
        business_info_json: { ...(clientProfile.business_info_json as any || {}) },
        brand_voice_json: { ...(clientProfile.brand_voice_json as any || {}) },
        offers_json: { ...(clientProfile.offers_json as any || {}) },
        content_prefs_json: { ...(clientProfile.content_prefs_json as any || {}) },
        assets_json: { ...(clientProfile.assets_json as any || {}) },
      });
    }
  };

  const updateDraftField = (section: string, key: string, value: any) => {
    setDraft((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleAssetUpload = async (field: string, file: File) => {
    if (!profile?.client_id) return;
    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop();
    const path = `${profile.client_id}/${field}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-assets").upload(path, compressed);
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("profile-assets").getPublicUrl(path);
    updateDraftField("assets_json", field, urlData.publicUrl);
    toast.success("File uploaded");
  };

  const submitForReview = useMutation({
    mutationFn: async () => {
      if (!profile?.client_id || !draft) throw new Error("Missing data");
      const { error } = await supabase.from("profile_update_requests").insert({
        client_id: profile.client_id,
        submitted_by_user_id: profile.id,
        proposed_profile_json: draft,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-profile-update"] });
      toast.success("Profile changes submitted for review!");
      setDraft(null);
    },
    onError: () => toast.error("Failed to submit changes"),
  });

  if (isLoading) {
    return <div className="p-6"><p className="text-muted-foreground">Loading profile...</p></div>;
  }

  const biz = (draft ? draft.business_info_json : clientProfile?.business_info_json || {}) as Record<string, any>;
  const voice = (draft ? draft.brand_voice_json : clientProfile?.brand_voice_json || {}) as Record<string, any>;
  const offers = (draft ? draft.offers_json : clientProfile?.offers_json || {}) as Record<string, any>;
  const prefs = (draft ? draft.content_prefs_json : clientProfile?.content_prefs_json || {}) as Record<string, any>;
  const assets = (draft ? draft.assets_json : clientProfile?.assets_json || {}) as Record<string, any>;
  const editing = !!draft;

  const Field = ({ label, section, field, multiline }: { label: string; section: string; field: string; multiline?: boolean }) => {
    const val = draft?.[section]?.[field] ?? (editing ? "" : ((clientProfile as any)?.[section] as any)?.[field] ?? "");
    if (!editing) {
      return (
        <div>
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
        </div>
      );
    }
    return (
      <div>
        <Label className="text-xs">{label}</Label>
        {multiline ? (
          <Textarea className="rounded-xl mt-1" value={val} onChange={(e) => updateDraftField(section, field, e.target.value)} />
        ) : (
          <Input className="rounded-xl mt-1" value={val} onChange={(e) => updateDraftField(section, field, e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Brand Voice Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your brand information and preferences</p>
        </div>
        {pendingUpdate && (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-full">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )}
      </div>

      {!clientProfile && (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">No profile set up yet. Your Stay Social team will configure this for you.</p>
        </div>
      )}

      {clientProfile && (
        <>
          {/* Pill-style tabs */}
          <div className="flex gap-1 bg-muted/40 rounded-full p-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  tab === t.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "business" && (
            <div className="card-elevated p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business Name" section="business_info_json" field="name" />
                <Field label="Location" section="business_info_json" field="location" />
                <Field label="Website" section="business_info_json" field="website" />
                <Field label="Booking Link" section="business_info_json" field="booking_link" />
                <Field label="Industry" section="business_info_json" field="industry" />
                <Field label="Contact Person" section="business_info_json" field="contact_person" />
                <div className="col-span-2"><Field label="Contact Email" section="business_info_json" field="contact_email" /></div>
                <div className="col-span-2"><Field label="Service Regions" section="business_info_json" field="service_regions" /></div>
                <div className="col-span-2"><Field label="Social Profiles" section="business_info_json" field="social_profiles" multiline /></div>
              </div>
            </div>
          )}

          {tab === "voice" && (
            <div className="card-elevated p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Voice</h3>
              <Field label="Tone" section="brand_voice_json" field="tone" />
              <Field label="Communication Style" section="brand_voice_json" field="communication_style" />
              <Field label="Tone Description" section="brand_voice_json" field="description" multiline />
              <Field label="Messaging Guidance" section="brand_voice_json" field="messaging_guidance" multiline />
              <Field label="Topics to Focus On" section="brand_voice_json" field="focus_topics" multiline />
              <Field label="Topics to Avoid" section="brand_voice_json" field="avoid_topics" multiline />
              <Field label="CTA Style" section="brand_voice_json" field="cta_style" />
              <Field label="Do's" section="brand_voice_json" field="dos" multiline />
              <Field label="Don'ts" section="brand_voice_json" field="donts" multiline />
            </div>
          )}

          {tab === "offers" && (
            <div className="card-elevated p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offers & Services</h3>
              <Field label="Unique Value Proposition" section="offers_json" field="unique_value_proposition" multiline />
              <Field label="Services" section="offers_json" field="services" multiline />
              <Field label="Current Promotions" section="offers_json" field="promos" multiline />
              <Field label="Target Audience" section="offers_json" field="target_audience" multiline />
              <Field label="FAQs" section="offers_json" field="faqs" multiline />
            </div>
          )}

          {tab === "prefs" && (
            <div className="card-elevated p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Preferences</h3>
              {editing ? (
                <>
                  <div>
                    <Label className="text-xs">Platforms</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PLATFORM_OPTIONS.map((p) => {
                        const current = (prefs.platforms || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                        const isActive = current.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              const updated = isActive
                                ? current.filter((x: string) => x !== p)
                                : [...current, p];
                              updateDraftField("content_prefs_json", "platforms", updated.join(", "));
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Posting Frequency</Label>
                    <Select
                      value={prefs.cadence || ""}
                      onValueChange={(v) => updateDraftField("content_prefs_json", "cadence", v)}
                    >
                      <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="3x_week">3x per week</SelectItem>
                        <SelectItem value="2x_week">2x per week</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Preferred Content Types" section="content_prefs_json" field="preferred_content_types" multiline />
                  <Field label="Video Preferences" section="content_prefs_json" field="video_preferences" multiline />
                  <Field label="Content Mix" section="content_prefs_json" field="content_mix" multiline />
                  <Field label="Approval Lead Time" section="content_prefs_json" field="approval_lead_time" />
                </>
              ) : (
                <>
                  <div><Label className="text-xs text-muted-foreground">Platforms</Label><p className="text-sm font-medium mt-0.5">{prefs.platforms || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Posting Cadence</Label><p className="text-sm font-medium mt-0.5">{prefs.cadence || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Preferred Content Types</Label><p className="text-sm font-medium mt-0.5">{prefs.preferred_content_types || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Video Preferences</Label><p className="text-sm font-medium mt-0.5">{prefs.video_preferences || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Content Mix</Label><p className="text-sm font-medium mt-0.5">{prefs.content_mix || "—"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Approval Lead Time</Label><p className="text-sm font-medium mt-0.5">{prefs.approval_lead_time || "—"}</p></div>
                </>
              )}
            </div>
          )}

          {tab === "assets" && (
            <div className="card-elevated p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Assets</h3>
              {editing ? (
                <>
                  {["logo", "headshots", "brand_images"].map((field) => (
                    <div key={field}>
                      <Label className="text-xs capitalize">{field.replace("_", " ")}</Label>
                      {assets[field] && (
                        <div className="flex items-center gap-2 mt-1 mb-2">
                          <img src={assets[field]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => updateDraftField("assets_json", field, null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Input
                        className="rounded-xl"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAssetUpload(field, file);
                        }}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {["logo", "headshots", "brand_images"].map((field) => (
                    <div key={field} className="text-center">
                      <Label className="text-muted-foreground capitalize text-xs">{field.replace("_", " ")}</Label>
                      {assets[field] ? (
                        <img src={assets[field]} alt="" className="h-20 w-20 rounded-xl object-cover mx-auto mt-1" />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mt-1">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Notification Preferences */}
      <NotificationPreferences />

      {isClientAdmin && clientProfile && !pendingUpdate && (
        <div className="flex justify-end sticky bottom-4">
          {!draft ? (
            <Button variant="outline" className="rounded-xl shadow-soft" onClick={initDraft}>
              <Save className="h-4 w-4 mr-2" />
              Edit & Submit Changes
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setDraft(null)}>Cancel</Button>
              <Button className="rounded-xl" onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                Submit Changes for Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
