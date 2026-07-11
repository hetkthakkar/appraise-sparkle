import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UserCheck, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees, listPerformance } from "@/lib/sheetsApi";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: SuperAdminDashboard,
});

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SuperAdminDashboard() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const month = currentMonthKey();

  const employeesQ = useQuery({
    queryKey: ["employees", email],
    queryFn: () => listEmployees(email),
    enabled: !!email,
  });
  const perfQ = useQuery({
    queryKey: ["performance", email, month],
    queryFn: () => listPerformance(email, month),
    enabled: !!email,
  });

  if (employeesQ.error) toast.error("Failed to load employees", { description: (employeesQ.error as Error).message });
  if (perfQ.error) toast.error("Failed to load performance", { description: (perfQ.error as Error).message });

  const employees = employeesQ.data ?? [];
  const perf = perfQ.data ?? [];

  const departments = useMemo(() => new Set(employees.map((e) => e.department)), [employees]);
  const teamLeads = useMemo(
    () =>
      new Set(
        employees
          .filter(
            (e) =>
              e.designation.toLowerCase().includes("lead") ||
              e.designation.toLowerCase().includes("head"),
          )
          .map((e) => e.name),
      ),
    [employees],
  );

  const uploaded = perf.length;
  const uploadStatus = employees.length > 0
    ? uploaded >= employees.length
      ? "Complete"
      : uploaded > 0
        ? `${uploaded}/${employees.length}`
        : "Pending"
    : "—";

  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

  const loading = employeesQ.isLoading || perfQ.isLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening across the organisation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
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
          <CardHeader>
            <CardTitle>Latest performance entries</CardTitle>
            <CardDescription>Most recent rows from {month}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </>
            ) : perf.length === 0 ? (
              <p className="text-sm text-muted-foreground">No performance data for {month} yet.</p>
            ) : (
              perf.slice(0, 5).map((r) => (
                <div key={r.employeeId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Production {r.productionActual}/{r.productionTarget} • Tickets {r.ticketActual}/{r.ticketTarget}
                    </div>
                  </div>
                  <Badge variant="secondary">{r.month}</Badge>
                </div>
              ))
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
              <>
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </>
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
