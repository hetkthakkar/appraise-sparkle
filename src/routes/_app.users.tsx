import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import type { Role } from "@/lib/types";
import { listUsers, updateUserRole, normalizeRole, ROLE_DISPLAY } from "@/lib/sheetsApi";
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

  const usersQ = useQuery({
    queryKey: ["users", user?.email],
    queryFn: () => listUsers(user!.email),
    enabled: !!user,
  });

  const roleMut = useMutation({
    mutationFn: ({ email, newRole }: { email: string; newRole: string }) =>
      updateUserRole(user!.email, email, newRole),
    onSuccess: (_d, vars) => {
      toast.success(`Role updated to ${vars.newRole}`);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error("Failed to update role", { description: (e as Error).message }),
  });

  if (usersQ.error) toast.error("Failed to load users", { description: (usersQ.error as Error).message });

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  const users = usersQ.data ?? [];

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
          {usersQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
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
                {users.map((u) => {
                  const role = normalizeRole(u.role);
                  const isSelf = u.email.toLowerCase() === user.email.toLowerCase();
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
                          onValueChange={(v) =>
                            roleMut.mutate({ email: u.email, newRole: ROLE_DISPLAY[v as Role] })
                          }
                          disabled={isSelf || roleMut.isPending}
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
                {users.length === 0 && (
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
