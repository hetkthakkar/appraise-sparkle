import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricRow } from "@/components/metric-row";
import { monthToLabel, type MyDashboard } from "@/lib/sheetsApi";

export function Field({ label, value }: { label: string; value?: unknown }) {
  const displayValue = value == null ? "" : String(value).trim();

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{displayValue || "—"}</div>
    </div>
  );
}

function ScoreBlock({ label, value, outOf }: { label: string; value: number; outOf: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{Number(value || 0).toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/ {outOf}</span>
      </div>
    </div>
  );
}

export function PerformanceView({ data, compact }: { data: MyDashboard; compact?: boolean }) {
  const profile = data?.profile ?? ({} as MyDashboard["profile"]);
  const current = data?.currentMonth;
  const previousMonths = data?.previousMonths;
  const history = [...(previousMonths ?? [])].sort((a, b) => (a.month < b.month ? 1 : -1));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{compact ? "Profile" : "My Profile"}</CardTitle>
          <CardDescription>Details from the employee master.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Employee ID" value={profile.employeeId} />
          <Field label="Name" value={profile.name} />
          <Field label="Email" value={profile.email} />
          <Field label="Department" value={profile.department} />
          <Field label="Designation" value={profile.designation} />
          <Field label="Team Lead" value={profile.teamLead} />
          <Field label="Location" value={profile.location} />
          <Field
            label="Joining Date"
            value={profile.joiningDate ? String(profile.joiningDate).slice(0, 10) : ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Current Month — {current ? monthToLabel(current.month) : "—"}
              </CardTitle>
              <CardDescription>Live snapshot of KPIs.</CardDescription>
            </div>
            {current && <Badge variant="secondary">Updated</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!current ? (
            <p className="text-sm text-muted-foreground">
              No performance data uploaded for this month yet.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <MetricRow
                  label="Production"
                  target={Number(current.productionTarget)}
                  actual={Number(current.productionActual)}
                />
                <MetricRow
                  label="Tickets"
                  target={Number(current.ticketTarget)}
                  actual={Number(current.ticketActual)}
                />
                <MetricRow
                  label="Internal Errors / Rejections"
                  target={Number(current.errorTarget)}
                  actual={Number(current.errorActual)}
                  invert
                />
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
                  <TableCell className="font-medium">{monthToLabel(p.month)}</TableCell>
                  <TableCell>{p.productionActual} / {p.productionTarget}</TableCell>
                  <TableCell>{p.ticketActual} / {p.ticketTarget}</TableCell>
                  <TableCell>{p.errorActual} / {p.errorTarget}</TableCell>
                  <TableCell>{Number(p.attendance || 0).toFixed(1)}</TableCell>
                  <TableCell>{Number(p.behavior || 0).toFixed(1)}</TableCell>
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
