import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees } from "@/lib/sheetsApi";
import { EmployeeDetailModal } from "@/components/employee-detail-modal";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && (user.role === "super_admin" || user.role === "admin"),
  });

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  const scope = data ?? [];
  const filtered = scope.filter((e) =>
    [e.name, e.email, e.employeeId, e.department].some((f) =>
      String(f ?? "").toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{user.role === "super_admin" ? "All Employees" : "My Team"}</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${filtered.length} of ${scope.length} shown`}
            </CardDescription>
          </div>
          <Input
            placeholder="Search by name, ID, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load employees: {error instanceof Error ? error.message : String(error)}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Team Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.employeeId}>
                    <TableCell className="font-mono text-xs">{e.employeeId}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.designation}</TableCell>
                    <TableCell>{e.teamLead}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No employees match your search.
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
