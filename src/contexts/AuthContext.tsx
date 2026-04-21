import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  client_id: string | null;
  parent_user_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  realProfile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  isSSRole: boolean;
  isSSAdmin: boolean;
  isSSManager: boolean;
  isSSTeam: boolean;
  isClientAdmin: boolean;
  isClientAssistant: boolean;
  actualIsSSAdmin: boolean;
  isViewingAs: boolean;
  isImpersonating: boolean;
  viewAsUserId: string | null;
  setViewAs: (userId: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  realProfile: null,
  roles: [],
  loading: true,
  isSSRole: false,
  isSSAdmin: false,
  isSSManager: false,
  isSSTeam: false,
  isClientAdmin: false,
  isClientAssistant: false,
  actualIsSSAdmin: false,
  isViewingAs: false,
  isImpersonating: false,
  viewAsUserId: null,
  setViewAs: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [realProfile, setRealProfile] = useState<UserProfile | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [viewAsProfile, setViewAsProfile] = useState<UserProfile | null>(null);
  const [viewAsRoles, setViewAsRoles] = useState<AppRole[]>([]);

  const checkDomainAllowed = async (email: string): Promise<boolean> => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;
    const { data, error } = await supabase
      .from("allowed_domains")
      .select("domain")
      .ilike("domain", domain)
      .limit(1);

    if (error) {
      console.error("Domain whitelist lookup failed:", error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  };

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const allowed = await checkDomainAllowed(email);
      if (!allowed) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const retryAllowed = await checkDomainAllowed(email);

        if (!retryAllowed) {
          toast.error("Your email domain is not authorized. Contact Stay Social to request access.");
          await supabase.auth.signOut();
          return;
        }
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData) {
        setRealProfile(profileData as UserProfile);
      }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesData) {
        setRealRoles(rolesData.map((r) => r.role));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const setViewAs = useCallback(async (userId: string | null) => {
    setViewAsUserId(userId);
    if (!userId) {
      setViewAsProfile(null);
      setViewAsRoles([]);
      return;
    }
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    if (profileData) {
      setViewAsProfile(profileData as UserProfile);
    }
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesData) {
      setViewAsRoles(rolesData.map((r) => r.role));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id, nextSession.user.email || "");
      } else {
        setRealProfile(null);
        setRealRoles([]);
        setViewAsUserId(null);
        setViewAsProfile(null);
        setViewAsRoles([]);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        // Fire-and-forget to avoid blocking the auth state change callback
        applySession(nextSession).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    );

    const initializeAuth = async () => {
      const timeout = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 8000);

      try {
        let {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        const hasAuthParams =
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token") ||
          window.location.hash.includes("refresh_token");

        if (!initialSession && hasAuthParams) {
          for (let attempt = 0; attempt < 5 && !initialSession; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();
            initialSession = retrySession;
          }
        }

        await applySession(initialSession);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRealProfile(null);
    setRealRoles([]);
    setViewAsUserId(null);
    setViewAsProfile(null);
    setViewAsRoles([]);
  };

  const actualIsSSAdmin = realRoles.includes("ss_admin");

  const isViewingAs = viewAsUserId !== null && viewAsProfile !== null;
  const profile = isViewingAs ? viewAsProfile : realProfile;
  const roles = isViewingAs ? viewAsRoles : realRoles;

  const isSSRole = roles.some((r) => r === "ss_admin" || r === "ss_producer" || r === "ss_ops" || r === "ss_team" || r === "ss_manager");
  const isSSAdmin = roles.includes("ss_admin");
  const isSSManager = roles.includes("ss_manager");
  const isSSTeam = roles.includes("ss_team") || roles.includes("ss_producer") || roles.includes("ss_ops");
  const isClientAdmin = roles.includes("client_admin");
  const isClientAssistant = roles.includes("client_assistant");

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        realProfile,
        roles,
        loading,
        isSSRole,
        isSSAdmin,
        isSSManager,
        isSSTeam,
        isClientAdmin,
        isClientAssistant,
        actualIsSSAdmin,
        isViewingAs,
        isImpersonating: isViewingAs,
        viewAsUserId,
        setViewAs,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
