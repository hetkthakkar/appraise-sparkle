import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { AuthUser, Role } from "./types";
import { toast } from "sonner";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin (Team Lead)",
  user: "Employee",
  no_access: "No Access",
};

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadUser(session: Session | null): Promise<AuthUser | null> {
  if (!session?.user) return null;
  const uid = session.user.id;
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from("profiles").select("email,name,avatar_url,employee_id,location").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid).order("role").limit(1).maybeSingle(),
  ]);
  const role = (roleRow?.role as Role) ?? "no_access";
  return {
    id: uid,
    email: profile?.email ?? session.user.email ?? "",
    name: profile?.name ?? session.user.user_metadata?.name ?? session.user.email ?? "User",
    avatar: profile?.avatar_url ?? undefined,
    employeeId: profile?.employee_id ?? undefined,
    location: profile?.location ?? undefined,
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (s: Session | null) => {
    setSession(s);
    const u = await loadUser(s);
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // defer to avoid deadlock
      setTimeout(() => { void applySession(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => { void applySession(data.session); });
    return () => sub.subscription.unsubscribe();
  }, [applySession]);

  const signInWithGoogle = useCallback(async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Sign-in failed", { description: result.error.message });
      return;
    }
    // If redirected, browser navigates away. Otherwise session is set.
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  const value = useMemo(
    () => ({ loading, session, user, signInWithGoogle, signOut, refresh }),
    [loading, session, user, signInWithGoogle, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
