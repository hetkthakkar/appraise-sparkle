import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import type { Role } from "@/lib/types";
import { setUserRole } from "@/lib/upload.functions";
import { useAllUsers } from "@/lib/queries";
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
  const users = useAllUsers();
  const qc = useQueryClient();
  const setRoleFn = useServerFn(setUserRole);

  const mutation = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => setRoleFn({ data: v }),
    onSuccess: (_data, v) => {
      toast.success(`Role updated to ${ROLE_LABEL[v.role]}`);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e: Error) => toast.error("Failed to update role", { description: e.message }),
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead className="w-[220px]">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.location ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{ROLE_LABEL[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => mutation.mutate({ userId: u.id, role: v as Role })}
                      disabled={u.id === user.id || mutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {(users.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{users.isLoading ? "Loading…" : "No users yet."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
