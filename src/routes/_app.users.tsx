import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import { listUsers, updateUserRole, normalizeRole, type SheetUser } from "@/lib/sheetsApi";
import type { Role } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const ROLES: Role[] = ["super_admin", "admin", "user", "no_access"];

function roleVariant(r: Role): "default" | "secondary" | "outline" | "destructive" {
  if (r === "super_admin") return "default";
  if (r === "admin") return "secondary";
  if (r === "user") return "outline";
  return "destructive";
}

function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", user?.email],
    queryFn: () => listUsers(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  const mutation = useMutation({
    mutationFn: (vars: { email: string; role: Role }) =>
      updateUserRole(user!.email, vars.email, vars.role),
    onSuccess: async (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["users", user?.email] });
qc.invalidateQueries({ queryKey: ["employees", user?.email] });
      toast.success(`Role updated to ${ROLE_LABEL[vars.role]}`);
    },
    onError: (e) => toast.error("Failed to update role", { description: e instanceof Error ? e.message : String(e) }),
  });

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
          <CardDescription>
            Assign roles to people who signed in with Google. New users default to <strong>No Access</strong>.
          </CardDescription>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead className="w-[220px]">Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((u: SheetUser) => {
                  const role = normalizeRole(u.role);
                  return (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">{u.name}</TableCell>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No users yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
