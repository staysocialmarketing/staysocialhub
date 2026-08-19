import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Platform config ───────────────────────────────────────────────────────

type Platform = "instagram" | "facebook" | "linkedin" | "google";

const PLATFORMS: { key: Platform; label: string; color: string; icon: string }[] = [
  { key: "instagram", label: "Instagram",  color: "bg-gradient-to-br from-purple-500 to-pink-500", icon: "📸" },
  { key: "facebook",  label: "Facebook",   color: "bg-blue-600",  icon: "👍" },
  { key: "linkedin",  label: "LinkedIn",   color: "bg-sky-700",   icon: "💼" },
  { key: "google",    label: "Google",     color: "bg-red-500",   icon: "🔍" },
];

// ── Types ─────────────────────────────────────────────────────────────────

interface LoginMeta {
  platform: string;
  username: string;
  has_password: boolean;
  updated_at: string;
  notes: string;
}

interface PlatformState {
  username: string;
  password: string;
  showPassword: boolean;
  dirty: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });
}

async function callSocialLogins(route: string, body: unknown, token: string) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-logins/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? "Request failed");
  return data;
}

// ── Main component ────────────────────────────────────────────────────────

export default function SocialLogins() {
  const queryClient = useQueryClient();

  const [platformState, setPlatformState] = useState<Record<Platform, PlatformState>>({
    instagram: { username: "", password: "", showPassword: false, dirty: false },
    facebook:  { username: "", password: "", showPassword: false, dirty: false },
    linkedin:  { username: "", password: "", showPassword: false, dirty: false },
    google:    { username: "", password: "", showPassword: false, dirty: false },
  });

  // Fetch meta (no passwords sent to client)
  const { data: meta, isLoading } = useQuery<LoginMeta[]>({
    queryKey: ["social-logins-meta"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await callSocialLogins("get-meta", {}, session.access_token);
      return res.logins as LoginMeta[];
    },
  });

  // Pre-fill usernames once meta loads
  useEffect(() => {
    if (!meta) return;
    setPlatformState((prev) => {
      const next = { ...prev };
      for (const login of meta) {
        const p = login.platform as Platform;
        if (p in next && !next[p].dirty) {
          next[p] = { ...next[p], username: login.username };
        }
      }
      return next;
    });
  }, [meta]);

  const saveMutation = useMutation({
    mutationFn: async ({ platform, username, password }: { platform: Platform; username: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      return callSocialLogins("upsert", { platform, username, password }, session.access_token);
    },
    onSuccess: (_data, variables) => {
      toast.success("Credentials updated securely ✓");
      setPlatformState((prev) => ({
        ...prev,
        [variables.platform]: { ...prev[variables.platform], password: "", dirty: false },
      }));
      queryClient.invalidateQueries({ queryKey: ["social-logins-meta"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save credentials");
    },
  });

  const getLoginMeta = (platform: Platform): LoginMeta | undefined =>
    meta?.find((m) => m.platform === platform);

  const handleSave = (platform: Platform) => {
    const state = platformState[platform];
    saveMutation.mutate({ platform, username: state.username, password: state.password });
  };

  const updateField = (platform: Platform, field: "username" | "password", value: string) => {
    setPlatformState((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value, dirty: true },
    }));
  };

  const toggleShow = (platform: Platform) => {
    setPlatformState((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], showPassword: !prev[platform].showPassword },
    }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-orange-50 text-orange-500 shrink-0">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Social Profile Logins</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
            Keep your credentials up to date. All passwords are encrypted and stored securely.
            Passwords are write-only — you can update them but they cannot be read back.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map(({ key, label, color, icon }) => {
          const state   = platformState[key];
          const loginMeta = getLoginMeta(key);
          const isSaving = saveMutation.isPending && saveMutation.variables?.platform === key;

          return (
            <Card key={key} className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center text-lg shrink-0`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                    {isLoading ? (
                      <p className="text-xs text-gray-400 mt-0.5">Loading...</p>
                    ) : loginMeta ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <p className="text-xs text-gray-400">Updated {formatDate(loginMeta.updated_at)}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <p className="text-xs text-gray-400">Not yet provided</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${key}-username`} className="text-xs font-medium text-gray-600">
                    Username / Email
                  </Label>
                  <Input
                    id={`${key}-username`}
                    type="text"
                    placeholder="username or email"
                    value={state.username}
                    onChange={(e) => updateField(key, "username", e.target.value)}
                    className="h-9 text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${key}-password`} className="text-xs font-medium text-gray-600">
                    Password {loginMeta?.has_password && <span className="text-gray-400 font-normal">(stored — enter new to update)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${key}-password`}
                      type={state.showPassword ? "text" : "password"}
                      placeholder={loginMeta?.has_password ? "••••••••" : "enter password"}
                      value={state.password}
                      onChange={(e) => updateField(key, "password", e.target.value)}
                      className="h-9 text-sm pr-9"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(key)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {state.showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full h-9 text-xs font-medium"
                  disabled={isSaving || (!state.dirty && !state.username && !state.password)}
                  onClick={() => handleSave(key)}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      Save {label}
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Credentials are encrypted at rest using AES-256. Nothing is sent over email.
        If you have questions, contact Tristan at Stay Social.
      </p>
    </div>
  );
}
