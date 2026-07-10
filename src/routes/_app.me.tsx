import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetricRow } from "@/components/metric-row";
import { useAuth } from "@/lib/mock-auth";
import { useEmployees, usePerformance } from "@/lib/queries";

export const Route = createFileRoute("/_app/me")({
  component: MyPerformance,
});

function MyPerformance() {
  const { user } = useAuth();
  const employees = useEmployees();
  const perf = usePerformance();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "user") return <Navigate to="/" />;

  if (!user.employeeId) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>No employee record</CardTitle>
          <CardDescription>
            Your account isn't linked to an employee ID yet. Ask your admin to add you to the Employee Master using the same email address.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const me = employees.data?.find((e) => e.employeeId === user.employeeId);
  const mine = (perf.data ?? []).filter((p) => p.employeeId === user.employeeId);
  const current = mine[0];
  const history = mine.slice(1);

  if (!me) {
    return <p className="p-6 text-muted-foreground">Loading your record…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your details from the employee master.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Employee ID" value={me.employeeId} />
          <Field label="Name" value={me.name} />
          <Field label="Email" value={me.email} />
          <Field label="Department" value={me.department} />
          <Field label="Designation" value={me.designation} />
          <Field label="Team Lead" value={me.teamLead} />
          <Field label="Location" value={me.location} />
        </CardContent>
      </Card>

      {current ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Month — {current.month}</CardTitle>
                <CardDescription>Live snapshot of your KPIs.</CardDescription>
              </div>
              <Badge variant="secondary">{current.location}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <MetricRow label="Production" target={current.productionTarget} actual={current.productionActual} />
              <MetricRow label="Tickets" target={current.ticketTarget} actual={current.ticketActual} />
              <MetricRow label="Internal Errors / Rejections" target={current.errorTarget} actual={current.errorActual} invert />
            </div>
            <div className="space-y-4">
              <ScoreBlock label="Attendance" value={current.attendance} outOf={10} />
              <ScoreBlock label="Behavior" value={current.behavior} outOf={5} />
              <div>
                <p className="text-sm font-medium">Manager Remarks</p>
                <p className="mt-1 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {current.managerRemarks || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No performance data</CardTitle>
            <CardDescription>Your team lead hasn't uploaded your monthly performance yet.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Months</CardTitle>
            <CardDescription>Performance history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Behavior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((p) => (
                  <TableRow key={p.month}>
                    <TableCell className="font-medium">{p.month}</TableCell>
                    <TableCell>{p.productionActual} / {p.productionTarget}</TableCell>
                    <TableCell>{p.ticketActual} / {p.ticketTarget}</TableCell>
                    <TableCell>{p.errorActual} / {p.errorTarget}</TableCell>
                    <TableCell>{p.attendance.toFixed(1)}</TableCell>
                    <TableCell>{p.behavior.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function ScoreBlock({ label, value, outOf }: { label: string; value: number; outOf: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{value.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/ {outOf}</span>
      </div>
    </div>
  );
}
