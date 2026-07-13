import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserProfile, normalizeRole } from "./sheetsApi";
import type { Role } from "./types";

const STORAGE_KEY = "epa.auth.v2";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signInWithCredential: (credential: string) => Promise<AuthUser>;
  refreshProfile: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function decodeJwt(token: string): { email?: string; name?: string } {
  try {
    const payload = token.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const decoded = decodeURIComponent(
      json
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

function loadStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadStored());
    setLoading(false);
  }, []);

  const persist = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const signInWithCredential = useCallback(
    async (credential: string) => {
      const { email, name } = decodeJwt(credential);
      if (!email) throw new Error("Google sign-in did not return an email");
      const profile = await getUserProfile(email, name ?? email);
      const authed: AuthUser = {
        email: profile.email ?? email,
        name: profile.name ?? name ?? email,
        role: normalizeRole(profile.role),
        employeeId: profile.employeeId,
      };
      persist(authed);
      return authed;
    },
    [persist]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await getUserProfile(user.email, user.name);
    persist({
      email: profile.email ?? user.email,
      name: profile.name ?? user.name,
      role: normalizeRole(profile.role),
      employeeId: profile.employeeId,
    });
  }, [user, persist]);

  const signOut = useCallback(() => {
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, loading, signInWithCredential, refreshProfile, signOut }),
    [user, loading, signInWithCredential, refreshProfile, signOut]
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
  admin: "Admin (Team Lead)",
  user: "Employee",
  no_access: "No Access",
};
