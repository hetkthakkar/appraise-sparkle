import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Users, FileUp, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import { EMPLOYEES, PERFORMANCE, CURRENT_MONTH } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/" />;

  const me = EMPLOYEES.find((e) => e.employeeId === user.employeeId);
  const team = EMPLOYEES.filter((e) => e.teamLead === me?.name);
  const teamPerf = PERFORMANCE.filter(
    (p) => p.month === CURRENT_MONTH && team.some((t) => t.employeeId === p.employeeId)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team Overview</h2>
        <p className="text-sm text-muted-foreground">{me?.department} • {team.length} reports</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team Size" value={team.length} icon={Users} />
        <StatCard label="Current Month" value={CURRENT_MONTH} icon={CalendarCheck2} />
        <StatCard label="Upload Status" value="Pending" icon={FileUp} hint="Upload June performance" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current month performance</CardTitle>
            <CardDescription>Snapshot of your team's {CURRENT_MONTH} numbers.</CardDescription>
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
                  <TableCell>{p.attendance.toFixed(1)}</TableCell>
                  <TableCell>{p.behavior.toFixed(1)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
