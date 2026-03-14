import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, FileText } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      return (data as any) || { in_app_enabled: true, email_enabled: false, daily_digest: false };
    },
    enabled: !!profile?.id,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      if (!profile?.id) return;
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({
          user_id: profile.id,
          ...prefs,
          ...updates,
          updated_at: new Date().toISOString(),
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  if (isLoading || !prefs) return null;

  const toggles = [
    { key: "in_app_enabled", label: "In-App Notifications", description: "Receive notifications in the HUB notification bell", icon: Bell },
    { key: "email_enabled", label: "Email Notifications", description: "Receive email alerts for important updates (coming soon)", icon: Mail },
    { key: "daily_digest", label: "Daily Digest", description: "Get a daily summary of activity instead of individual alerts (coming soon)", icon: FileText },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {toggles.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={(prefs as any)[key] ?? false}
              onCheckedChange={(checked) => upsert.mutate({ [key]: checked })}
              disabled={upsert.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
