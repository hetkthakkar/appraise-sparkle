import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_USERS } from "./mock-data";
import type { AuthUser, Role } from "./types";

const STORAGE_KEY = "epa.auth.v1";
const USERS_KEY = "epa.users.v1";

interface AuthCtx {
  user: AuthUser | null;
  users: AuthUser[];
  signInAs: (id: string) => void;
  signOut: () => void;
  setRole: (userId: string, role: Role) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function loadUsers(): AuthUser[] {
  if (typeof window === "undefined") return DEMO_USERS;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as AuthUser[];
  } catch {}
  return DEMO_USERS;
}

function loadCurrent(users: AuthUser[]): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) return null;
    return users.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>(() => loadUsers());
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(loadCurrent(users));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {}
  }, [users]);

  const signInAs = useCallback(
    (id: string) => {
      const u = users.find((x) => x.id === id) ?? null;
      setUser(u);
      try {
        if (u) window.localStorage.setItem(STORAGE_KEY, u.id);
      } catch {}
    },
    [users]
  );

  const signOut = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const setRole = useCallback((userId: string, role: Role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    setUser((cur) => (cur && cur.id === userId ? { ...cur, role } : cur));
  }, []);

  const value = useMemo(
    () => ({ user, users, signInAs, signOut, setRole }),
    [user, users, signInAs, signOut, setRole]
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
