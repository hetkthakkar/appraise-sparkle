import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import { listUsers, updateUserRole, normalizeRole, type SheetUser } from "@/lib/sheetsApi";
import type { Role } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const ROLES: Role[] = ["super_admin", "admin", "user", "no_access"];

const ROLE_PRIORITY: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  user: 2,
  no_access: 1,
};

function roleVariant(r: Role): "default" | "secondary" | "outline" | "destructive" {
  if (r === "super_admin") return "default";
  if (r === "admin") return "secondary";
  if (r === "user") return "outline";
  return "destructive";
}

function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", user?.email],
    queryFn: () => listUsers(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  const mutation = useMutation({
    mutationFn: (vars: { email: string; role: Role }) =>
      updateUserRole(user!.email, vars.email, vars.role),
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["users", user?.email] }),
        qc.invalidateQueries({ queryKey: ["employees", user?.email] }),
      ]);
      toast.success(`Role updated to ${ROLE_LABEL[vars.role]}`);
    },
    onError: (e) =>
      toast.error("Failed to update role", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  // De-duplicate users by normalized email
  const uniqueUsers = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const map = new Map<string, SheetUser>();

    data.forEach((u) => {
      const email = String(u.email ?? "").trim().toLowerCase();
      if (!email) return;

      const existing = map.get(email);
      if (!existing) {
        map.set(email, {
          ...u,
          email,
          name: String(u.name ?? "").trim(),
        });
      } else {
        // If duplicate exists, preserve whichever has the higher privilege role
        const currentRole = normalizeRole(existing.role);
        const newRole = normalizeRole(u.role);

        if (ROLE_PRIORITY[newRole] > ROLE_PRIORITY[currentRole]) {
          map.set(email, {
            ...existing,
            role: u.role,
            name: String(u.name ?? "").trim() || existing.name,
          });
        }
      }
    });

    const list = Array.from(map.values());

    if (!search.trim()) return list;

    const q = search.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        ROLE_LABEL[normalizeRole(u.role)]?.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Users & Roles</CardTitle>
              <CardDescription>
                Assign roles to people who signed in with Google. New users default to <strong>No Access</strong>.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load users: {error instanceof Error ? error.message : String(error)}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[540px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="w-[200px]">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueUsers.map((u: SheetUser) => {
                    const role = normalizeRole(u.role);
                    return (
                      <TableRow key={u.email}>
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleVariant(role)}>{ROLE_LABEL[role]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={role}
                            onValueChange={(v) => mutation.mutate({ email: u.email, role: v as Role })}
                            disabled={u.email === user.email || mutation.isPending}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_LABEL[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {uniqueUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
