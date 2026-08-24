import React, { useState, useEffect } from "react";
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

// Brand SVG icons — white on brand-color bg, except Google (multicolor on white)
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="white" strokeWidth="1" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const PLATFORMS: { key: Platform; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "instagram", label: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500", icon: <InstagramIcon /> },
  { key: "facebook",  label: "Facebook",  color: "bg-blue-600",                                   icon: <FacebookIcon /> },
  { key: "linkedin",  label: "LinkedIn",  color: "bg-sky-700",                                    icon: <LinkedInIcon /> },
  { key: "google",    label: "Google",    color: "bg-white border border-gray-200",               icon: <GoogleIcon /> },
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
