import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricRow } from "@/components/metric-row";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees, listPerformance } from "@/lib/sheetsApi";
import { EmployeeOnboarding } from "@/components/employee-onboarding";

export const Route = createFileRoute("/_app/me")({
  component: MyPerformance,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function MyPerformance() {
  const { user } = useAuth();
  const month = currentMonth();

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && user.role === "user",
  });

  const perfQ = useQuery({
    queryKey: ["performance", user?.email, "all"],
    queryFn: () => listPerformance(user!.email),
    enabled: !!user && user.role === "user",
  });

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "user") return <Navigate to="/" />;

  if (empQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const me =
    (empQ.data ?? []).find((e) => e.email === user.email) ??
    (empQ.data ?? []).find((e) => e.employeeId === user.employeeId);

  if (!me) return <p className="p-6 text-muted-foreground">No employee record found for your account.</p>;

  const needsOnboarding =
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.teamLead?.trim() ||
    !me.location?.trim();

  if (needsOnboarding) {
    return <EmployeeOnboarding me={me} />;
  }

  const myPerf = (perfQ.data ?? []).filter(
    (p) => p.employeeId === me?.employeeId || p.employeeId === user.employeeId
  );
  const current = myPerf.find((p) => p.month === month);
  const history = myPerf
    .filter((p) => p.month !== month)
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  if (perfQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Month — {month}</CardTitle>
              <CardDescription>Live snapshot of your KPIs.</CardDescription>
            </div>
            {current && <Badge variant="secondary">Updated</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!current ? (
            <p className="text-sm text-muted-foreground">No performance data uploaded for this month yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <MetricRow label="Production" target={current.productionTarget} actual={current.productionActual} />
                <MetricRow label="Tickets" target={current.ticketTarget} actual={current.ticketActual} />
                <MetricRow label="Internal Errors / Rejections" target={current.errorTarget} actual={current.errorActual} invert />
              </div>
              <div className="space-y-4">
                <ScoreBlock label="Attendance" value={Number(current.attendance)} outOf={10} />
                <ScoreBlock label="Behavior" value={Number(current.behavior)} outOf={5} />
                <div>
                  <p className="text-sm font-medium">Manager Remarks</p>
                  <p className="mt-1 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {current.managerRemarks || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <TableCell>{Number(p.attendance).toFixed(1)}</TableCell>
                  <TableCell>{Number(p.behavior).toFixed(1)}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No history yet.
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
