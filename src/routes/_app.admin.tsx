import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, FileUp, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import { useEmployees, usePerformance } from "@/lib/queries";

export const Route = createFileRoute("/_app/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const employees = useEmployees();
  const perf = usePerformance();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "admin") return <Navigate to="/" />;

  const list = employees.data ?? [];
  const me = list.find((e) => e.employeeId === user.employeeId);
  const team = useMemo(() => list.filter((e) => me && e.teamLead === me.name), [list, me]);
  const latestMonth = perf.data?.[0]?.month;
  const teamPerf = (perf.data ?? []).filter(
    (p) => p.month === latestMonth && team.some((t) => t.employeeId === p.employeeId)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team Overview</h2>
        <p className="text-sm text-muted-foreground">
          {me ? `${me.department} • ${me.location} • ${team.length} reports` : "Your employee record isn't linked yet."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team Size" value={team.length} icon={Users} />
        <StatCard label="Latest Month" value={latestMonth ?? "—"} icon={CalendarCheck2} />
        <StatCard label="Upload Status" value={teamPerf.length ? "Complete" : "Pending"} icon={FileUp} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current month performance</CardTitle>
            <CardDescription>{latestMonth ? `Snapshot for ${latestMonth}.` : "No performance data yet."}</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link to="/upload">Upload File</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Location</TableHead>
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
                  <TableCell>{p.location}</TableCell>
                  <TableCell>{p.productionActual} / {p.productionTarget}</TableCell>
                  <TableCell>{p.ticketActual} / {p.ticketTarget}</TableCell>
                  <TableCell>{p.errorActual} / {p.errorTarget}</TableCell>
                  <TableCell>{p.attendance.toFixed(1)}</TableCell>
                  <TableCell>{p.behavior.toFixed(1)}</TableCell>
                </TableRow>
              ))}
              {teamPerf.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No performance rows yet for your team.
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
