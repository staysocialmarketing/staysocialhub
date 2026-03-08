import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Clock, Upload, X, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "Twitter/X", "YouTube"];

export default function Profile() {
  const { profile, isClientAdmin } = useAuth();
  const queryClient = useQueryClient();

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
          <Label className="text-muted-foreground">{label}</Label>
          <p className="font-medium">{val || "—"}</p>
        </div>
      );
    }
    return (
      <div>
        <Label>{label}</Label>
        {multiline ? (
          <Textarea value={val} onChange={(e) => updateDraftField(section, field, e.target.value)} />
        ) : (
          <Input value={val} onChange={(e) => updateDraftField(section, field, e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Brand Voice Hub</h2>
          <p className="text-muted-foreground">Your brand information and preferences</p>
        </div>
        {pendingUpdate && (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )}
      </div>

      {!clientProfile && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No profile set up yet. Your Stay Social team will configure this for you.</p>
          </CardContent>
        </Card>
      )}

      {clientProfile && (
        <Tabs defaultValue="business">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="voice">Brand Voice</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="prefs">Content Prefs</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card>
              <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business Name" section="business_info_json" field="name" />
                  <Field label="Location" section="business_info_json" field="location" />
                  <Field label="Website" section="business_info_json" field="website" />
                  <Field label="Booking Link" section="business_info_json" field="booking_link" />
                  <Field label="Industry" section="business_info_json" field="industry" />
                  <Field label="Contact Person" section="business_info_json" field="contact_person" />
                  <div className="col-span-2">
                    <Field label="Contact Email" section="business_info_json" field="contact_email" />
                  </div>
                  <div className="col-span-2">
                    <Field label="Service Regions" section="business_info_json" field="service_regions" />
                  </div>
                  <div className="col-span-2">
                    <Field label="Social Profiles" section="business_info_json" field="social_profiles" multiline />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice">
            <Card>
              <CardHeader><CardTitle>Brand Voice</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Tone" section="brand_voice_json" field="tone" />
                <Field label="Communication Style" section="brand_voice_json" field="communication_style" />
                <Field label="Tone Description" section="brand_voice_json" field="description" multiline />
                <Field label="Messaging Guidance" section="brand_voice_json" field="messaging_guidance" multiline />
                <Field label="Topics to Focus On" section="brand_voice_json" field="focus_topics" multiline />
                <Field label="Topics to Avoid" section="brand_voice_json" field="avoid_topics" multiline />
                <Field label="CTA Style" section="brand_voice_json" field="cta_style" />
                <Field label="Do's" section="brand_voice_json" field="dos" multiline />
                <Field label="Don'ts" section="brand_voice_json" field="donts" multiline />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card>
              <CardHeader><CardTitle>Offers & Services</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Unique Value Proposition" section="offers_json" field="unique_value_proposition" multiline />
                <Field label="Services" section="offers_json" field="services" multiline />
                <Field label="Current Promotions" section="offers_json" field="promos" multiline />
                <Field label="Target Audience" section="offers_json" field="target_audience" multiline />
                <Field label="FAQs" section="offers_json" field="faqs" multiline />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prefs">
            <Card>
              <CardHeader><CardTitle>Content Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div>
                      <Label>Platforms</Label>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {PLATFORM_OPTIONS.map((p) => {
                          const current = (prefs.platforms || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                          return (
                            <label key={p} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={current.includes(p)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...current, p]
                                    : current.filter((x: string) => x !== p);
                                  updateDraftField("content_prefs_json", "platforms", updated.join(", "));
                                }}
                              />
                              {p}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>Posting Frequency</Label>
                      <Select
                        value={prefs.cadence || ""}
                        onValueChange={(v) => updateDraftField("content_prefs_json", "cadence", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
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
                    <div><Label className="text-muted-foreground">Platforms</Label><p className="font-medium">{prefs.platforms || "—"}</p></div>
                    <div><Label className="text-muted-foreground">Posting Cadence</Label><p className="font-medium">{prefs.cadence || "—"}</p></div>
                    <div><Label className="text-muted-foreground">Preferred Content Types</Label><p className="font-medium">{prefs.preferred_content_types || "—"}</p></div>
                    <div><Label className="text-muted-foreground">Video Preferences</Label><p className="font-medium">{prefs.video_preferences || "—"}</p></div>
                    <div><Label className="text-muted-foreground">Content Mix</Label><p className="font-medium">{prefs.content_mix || "—"}</p></div>
                    <div><Label className="text-muted-foreground">Approval Lead Time</Label><p className="font-medium">{prefs.approval_lead_time || "—"}</p></div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardHeader><CardTitle>Brand Assets</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    {["logo", "headshots", "brand_images"].map((field) => (
                      <div key={field}>
                        <Label className="capitalize">{field.replace("_", " ")}</Label>
                        {assets[field] && (
                          <div className="flex items-center gap-2 mt-1 mb-2">
                            <img src={assets[field]} alt="" className="h-16 w-16 rounded object-cover" />
                            <Button variant="ghost" size="icon" onClick={() => updateDraftField("assets_json", field, null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Input
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
                          <img src={assets[field]} alt="" className="h-20 w-20 rounded object-cover mx-auto mt-1" />
                        ) : (
                          <div className="h-20 w-20 rounded bg-muted flex items-center justify-center mx-auto mt-1">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {isClientAdmin && clientProfile && !pendingUpdate && (
        <div className="flex justify-end">
          {!draft ? (
            <Button variant="outline" onClick={initDraft}>
              <Save className="h-4 w-4 mr-2" />
              Edit & Submit Changes
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                Submit Changes for Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
