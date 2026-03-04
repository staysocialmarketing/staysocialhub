import React, { createContext, useContext, useEffect, useState } from "react";
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
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesData) {
      setRoles(rolesData.map((r) => r.role));
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
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
    setProfile(null);
    setRoles([]);
  };

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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
