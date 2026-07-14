import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileUp, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees, listPerformance } from "@/lib/sheetsApi";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function AdminDashboard() {
  const { user } = useAuth();
  const month = currentMonth();

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && user.role === "admin",
  });

  const perfQ = useQuery({
    queryKey: ["performance", user?.email, month],
    queryFn: () => listPerformance(user!.email, month),
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") return <Navigate to="/" />;

  const employees = empQ.data ?? [];
  const me = employees.find((e) => e.email === user.email);
  const team = me ? employees.filter((e) => e.teamLead === me.name) : employees;
  const teamPerf = (perfQ.data ?? []).filter((p) =>
    team.some((t) => t.employeeId === p.employeeId)
  );

  const uploadStatus =
    perfQ.isLoading
      ? "…"
      : team.length === 0
        ? "No team"
        : teamPerf.length >= team.length
          ? "Complete"
          : teamPerf.length > 0
            ? "Partial"
            : "Pending";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team Overview</h2>
        <p className="text-sm text-muted-foreground">
          {me?.department ?? "—"} • {team.length} reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team Size" value={team.length} icon={Users} />
        <StatCard label="Current Month" value={month} icon={CalendarCheck2} />
        <StatCard label="Upload Status" value={uploadStatus} icon={FileUp} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current month performance</CardTitle>
            <CardDescription>Snapshot of your team's {month} numbers.</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link to="/upload">Upload File</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {empQ.isLoading || perfQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Behavior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerf.map((p) => (
                  <TableRow key={p.employeeId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.productionActual} / {p.productionTarget}</TableCell>
                    <TableCell>{p.ticketActual} / {p.ticketTarget}</TableCell>
                    <TableCell>{p.errorActual} / {p.errorTarget}</TableCell>
                    <TableCell>{Number(p.attendance).toFixed(1)}</TableCell>
                    <TableCell>{Number(p.behavior).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {teamPerf.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No data yet for this month.
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
