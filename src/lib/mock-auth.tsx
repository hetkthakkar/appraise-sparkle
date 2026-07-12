import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getUserProfile, normalizeRole } from "./sheetsApi";
import type { Role } from "./types";

const STORAGE_KEY = "epa.auth.v2";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function loadStored(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function persist(u: SessionUser | null) {
  try {
    if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

type AuthIdentity = {
  email?: string | null;
  name?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function getIdentityName(identity: AuthIdentity, email: string) {
  const metadata = identity.user_metadata ?? {};
  const metadataName = metadata.full_name ?? metadata.name ?? metadata.display_name;
  return (typeof identity.name === "string" && identity.name) ||
    (typeof metadataName === "string" && metadataName) ||
    email;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (identity: AuthIdentity | null | undefined) => {
    const email = (identity?.email ?? "").toLowerCase();
    if (!email) {
      setUser(null);
      persist(null);
      return null;
    }
    const name = getIdentityName(identity ?? {}, email);
    const profile = await getUserProfile(email, name);
    const session: SessionUser = {
      email,
      name: profile.name || name,
      role: normalizeRole(profile.role),
    };
    setUser(session);
    persist(session);
    return session;
  }, []);

  useEffect(() => {
    let mounted = true;
    const cached = loadStored();
    if (cached) setUser(cached);

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        setUser(null);
        persist(null);
        setLoading(false);
        return;
      }
      syncProfile(data.user)
        .catch(() => {
          setUser(cached);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        persist(null);
        return;
      }
      if (session?.user) {
        window.setTimeout(() => {
          syncProfile(session.user).catch(() => undefined);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signInWithGoogle = useCallback(async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.redirected) return null;
    if (result.error) throw result.error;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error ?? new Error("Google sign-in did not return a user");
    return syncProfile(data.user);
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    persist(null);
  }, []);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    const profile = await getUserProfile(user.email, user.name);
    const next: SessionUser = { ...user, role: normalizeRole(profile.role) };
    setUser(next);
    persist(next);
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signOut, refreshRole }),
    [user, loading, signInWithGoogle, signOut, refreshRole],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
  no_access: "No Access",
};
