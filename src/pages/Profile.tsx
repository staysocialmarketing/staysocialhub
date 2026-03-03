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
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";

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
        business_info_json: clientProfile.business_info_json || {},
        brand_voice_json: clientProfile.brand_voice_json || {},
        offers_json: clientProfile.offers_json || {},
        content_prefs_json: clientProfile.content_prefs_json || {},
        assets_json: clientProfile.assets_json || {},
      });
    }
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

  const biz = (clientProfile?.business_info_json || {}) as Record<string, any>;
  const voice = (clientProfile?.brand_voice_json || {}) as Record<string, any>;
  const offers = (clientProfile?.offers_json || {}) as Record<string, any>;
  const prefs = (clientProfile?.content_prefs_json || {}) as Record<string, any>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Client Profile</h2>
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
                  <div><Label className="text-muted-foreground">Business Name</Label><p className="font-medium">{biz.name || "—"}</p></div>
                  <div><Label className="text-muted-foreground">Website</Label><p className="font-medium">{biz.website || "—"}</p></div>
                  <div><Label className="text-muted-foreground">Contact Email</Label><p className="font-medium">{biz.contact_email || "—"}</p></div>
                  <div><Label className="text-muted-foreground">Booking Link</Label><p className="font-medium">{biz.booking_link || "—"}</p></div>
                  <div className="col-span-2"><Label className="text-muted-foreground">Service Area</Label><p className="font-medium">{biz.service_area || "—"}</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice">
            <Card>
              <CardHeader><CardTitle>Brand Voice</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Voice Description</Label><p className="font-medium">{voice.description || "—"}</p></div>
                <div><Label className="text-muted-foreground">Do's</Label><p className="font-medium">{voice.dos || "—"}</p></div>
                <div><Label className="text-muted-foreground">Don'ts</Label><p className="font-medium">{voice.donts || "—"}</p></div>
                <div><Label className="text-muted-foreground">Topics to Focus On</Label><p className="font-medium">{voice.focus_topics || "—"}</p></div>
                <div><Label className="text-muted-foreground">Topics to Avoid</Label><p className="font-medium">{voice.avoid_topics || "—"}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card>
              <CardHeader><CardTitle>Offers & Services</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Services</Label><p className="font-medium">{offers.services || "—"}</p></div>
                <div><Label className="text-muted-foreground">Current Promotions</Label><p className="font-medium">{offers.promos || "—"}</p></div>
                <div><Label className="text-muted-foreground">Target Audience</Label><p className="font-medium">{offers.target_audience || "—"}</p></div>
                <div><Label className="text-muted-foreground">FAQs</Label><p className="font-medium">{offers.faqs || "—"}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prefs">
            <Card>
              <CardHeader><CardTitle>Content Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Platforms</Label><p className="font-medium">{prefs.platforms || "—"}</p></div>
                <div><Label className="text-muted-foreground">Posting Cadence</Label><p className="font-medium">{prefs.cadence || "—"}</p></div>
                <div><Label className="text-muted-foreground">Content Mix</Label><p className="font-medium">{prefs.content_mix || "—"}</p></div>
                <div><Label className="text-muted-foreground">Approval Lead Time</Label><p className="font-medium">{prefs.approval_lead_time || "—"}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardHeader><CardTitle>Brand Assets</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Brand assets managed by your Stay Social team.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {isClientAdmin && clientProfile && !pendingUpdate && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={initDraft} disabled={!!draft}>
            <Save className="h-4 w-4 mr-2" />
            Edit & Submit Changes
          </Button>
        </div>
      )}

      {draft && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              You're editing a draft. Changes won't go live until approved by Stay Social.
            </p>
            <Button onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
              Submit Changes for Review
            </Button>
            <Button variant="ghost" className="ml-2" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
