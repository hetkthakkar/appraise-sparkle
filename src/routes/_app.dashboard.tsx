import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UserCheck, CalendarCheck2, Download } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/mock-auth";
import { getMyDashboard, listEmployees, listPerformance } from "@/lib/sheetsApi";
import { exportPerformance } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { EmployeeOnboarding } from "@/components/employee-onboarding";

export const Route = createFileRoute("/_app/dashboard")({
  component: SuperAdminDashboard,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SuperAdminDashboard() {
  const { user } = useAuth();
  const month = currentMonth();

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

 const perfQ = useQuery({
  queryKey: ["performance", user?.email, month],
  queryFn: async () => {
    const rows = await listPerformance(
      user!.email,
      month
    );

    // Normalize the month on the frontend as a safety check.
    // This prevents the Dashboard from showing 0 even when
    // the backend has returned the correct current-month rows.
    const normalizeMonth = (value: unknown) => {
      if (!value) return "";

      const s = String(value).trim();

      const match = s.match(
        /^(?:[A-Za-z]+)[-\s\/](\d{4})$/i
      );

      if (match) {
        const monthNames = [
          "jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec",
        ];

        const name =
          s.split(/[-\s\/]/)[0].toLowerCase();

        const index = monthNames.indexOf(
          name.slice(0, 3)
        );

        if (index !== -1) {
          return `${match[1]}-${String(index + 1).padStart(2, "0")}`;
        }
      }

      const ym = s.match(
        /^(\d{4})[-\/](\d{1,2})/
      );

      if (ym) {
        return `${ym[1]}-${String(ym[2]).padStart(2, "0")}`;
      }

      return s;
    };

    const normalizedCurrentMonth =
      normalizeMonth(month);

    return rows.filter(
      row =>
        normalizeMonth(row.month) ===
        normalizedCurrentMonth
    );
  },
  enabled:
    !!user &&
    user.role === "super_admin",
  });

  const meQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

  if (meQ.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const me = meQ.data?.profile;
  const needsOnboarding =
  !me ||
  !me.department?.trim() ||
  !me.designation?.trim() ||
  !me.location?.trim() ||
  !String(me.joiningDate ?? "").trim();
  
  if (needsOnboarding) {
    return (
      <EmployeeOnboarding
        me={
          me ?? {
            employeeId: user.employeeId ?? "",
            name: user.name,
            email: user.email,
            department: "",
            designation: "",
            teamLead: "",
            location: "",
            joiningDate: "",
          }
        }
      />
    );
  }

  const employees = empQ.data ?? [];
  const perf = perfQ.data ?? [];

  const departments = new Set(employees.map((e) => e.department).filter(Boolean));
  const teamLeads = new Set(
    employees
      .filter(
        (e) =>
          e.designation?.toLowerCase().includes("lead") ||
          e.designation?.toLowerCase().includes("head")
      )
      .map((e) => e.name)
  );
  const uploadStatus =
    perfQ.isLoading || empQ.isLoading
      ? "…"
      : employees.length === 0
        ? "No data"
        : perf.length >= employees.length
          ? "Complete"
          : perf.length > 0
            ? "Partial"
            : "Pending";

  const loading = empQ.isLoading || perfQ.isLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening across the organisation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Total Employees" value={employees.length} icon={Users} />
            <StatCard label="Total Departments" value={departments.size} icon={Building2} />
            <StatCard label="Total Team Leads" value={teamLeads.size} icon={UserCheck} />
            <StatCard label="Monthly Upload" value={uploadStatus} icon={CalendarCheck2} hint={month} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Current month coverage</CardTitle>
              <CardDescription>Performance rows uploaded for {month}.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportPerformance(perf)} disabled={!perf.length}>
              <Download />
              Export Data
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16" />
            ) : (
              <div className="flex items-center justify-between rounded-md border p-4 text-sm">
                <div>
                  <div className="font-medium">{perf.length} / {employees.length} employees</div>
                  <div className="text-xs text-muted-foreground">Rows submitted this month</div>
                </div>
                <Badge variant={uploadStatus === "Complete" ? "default" : "secondary"}>{uploadStatus}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Headcount by department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-24" />
            ) : (
              Array.from(departments).map((d) => {
                const count = employees.filter((e) => e.department === d).length;
                return (
                  <div key={d} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span className="font-medium">{d}</span>
                    <Badge variant="outline">{count} people</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
