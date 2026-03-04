import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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
  roles: AppRole[];
  loading: boolean;
  isSSRole: boolean;
  isSSAdmin: boolean;
  isSSTeam: boolean;
  isClientAdmin: boolean;
  isClientAssistant: boolean;
  actualIsSSAdmin: boolean;
  isViewingAs: boolean;
  viewAsUserId: string | null;
  setViewAs: (userId: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  isSSRole: false,
  isSSAdmin: false,
  isSSTeam: false,
  isClientAdmin: false,
  isClientAssistant: false,
  actualIsSSAdmin: false,
  isViewingAs: false,
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

  // View-as state
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [viewAsProfile, setViewAsProfile] = useState<UserProfile | null>(null);
  const [viewAsRoles, setViewAsRoles] = useState<AppRole[]>([]);

  const fetchProfile = async (userId: string) => {
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
  };

  const setViewAs = useCallback(async (userId: string | null) => {
    setViewAsUserId(userId);
    if (!userId) {
      setViewAsProfile(null);
      setViewAsRoles([]);
      return;
    }
    // Fetch the target user's profile and roles
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setRealProfile(null);
          setRealRoles([]);
          setViewAsUserId(null);
          setViewAsProfile(null);
          setViewAsRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRealProfile(null);
    setRealRoles([]);
    setViewAsUserId(null);
    setViewAsProfile(null);
    setViewAsRoles([]);
  };

  // Real role booleans (never change regardless of view-as)
  const actualIsSSAdmin = realRoles.includes("ss_admin");

  // Effective values: use view-as when active, otherwise real
  const isViewingAs = viewAsUserId !== null && viewAsProfile !== null;
  const profile = isViewingAs ? viewAsProfile : realProfile;
  const roles = isViewingAs ? viewAsRoles : realRoles;

  const isSSRole = roles.some((r) => r === "ss_admin" || r === "ss_producer" || r === "ss_ops");
  const isSSAdmin = roles.includes("ss_admin");
  const isSSTeam = roles.includes("ss_producer") || roles.includes("ss_ops");
  const isClientAdmin = roles.includes("client_admin");
  const isClientAssistant = roles.includes("client_assistant");

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        isSSRole,
        isSSAdmin,
        isSSTeam,
        isClientAdmin,
        isClientAssistant,
        actualIsSSAdmin,
        isViewingAs,
        viewAsUserId,
        setViewAs,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
