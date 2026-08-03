import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UserCheck, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees, listPerformance } from "@/lib/sheetsApi";

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
    queryFn: () => listPerformance(user!.email, month),
    enabled: !!user && user.role === "super_admin",
  });

  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

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
          <CardHeader>
            <CardTitle>Current month coverage</CardTitle>
            <CardDescription>Performance rows uploaded for {month}.</CardDescription>
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
