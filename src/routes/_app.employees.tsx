import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import { useEmployees } from "@/lib/queries";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { user } = useAuth();
  const employees = useEmployees();
  const [q, setQ] = useState("");

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  const list = employees.data ?? [];
  const me = list.find((e) => e.employeeId === user.employeeId);
  const scope = user.role === "super_admin" ? list : list.filter((e) => me && e.teamLead === me.name);

  const filtered = useMemo(
    () =>
      scope.filter((e) =>
        [e.name, e.email, e.employeeId, e.department, e.location].some((f) =>
          (f ?? "").toLowerCase().includes(q.toLowerCase())
        )
      ),
    [scope, q]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{user.role === "super_admin" ? "All Employees" : "My Team"}</CardTitle>
            <CardDescription>{filtered.length} of {scope.length} shown</CardDescription>
          </div>
          <Input
            placeholder="Search by name, ID, email, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Location</TableHead>
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
                  <TableCell>{e.location}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {employees.isLoading ? "Loading…" : "No employees found. Import the Employee Master to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
