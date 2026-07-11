import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  signInWithCredential: (credential: string) => Promise<SessionUser>;
  signOut: () => void;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function decodeJwtPayload(token: string): { email?: string; name?: string } {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    // handle utf-8
    const decoded = decodeURIComponent(
      json
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return {};
    }
  }
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadStored());
    setLoading(false);
  }, []);

  const signInWithCredential = useCallback(async (credential: string) => {
    const payload = decodeJwtPayload(credential);
    const email = (payload.email ?? "").toLowerCase();
    const name = payload.name ?? email;
    if (!email) throw new Error("Google sign-in did not return an email");
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

  const signOut = useCallback(() => {
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
    () => ({ user, loading, signInWithCredential, signOut, refreshRole }),
    [user, loading, signInWithCredential, signOut, refreshRole],
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
