import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Users, Building2, UserCheck, CalendarCheck2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/mock-auth";
import { EMPLOYEES, CURRENT_MONTH } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/dashboard")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const { user } = useAuth();
  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

  const departments = new Set(EMPLOYEES.map((e) => e.department));
  const teamLeads = new Set(
    EMPLOYEES.filter((e) => e.designation.toLowerCase().includes("lead") || e.designation.toLowerCase().includes("head"))
      .map((e) => e.name)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening across the organisation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={EMPLOYEES.length} icon={Users} />
        <StatCard label="Total Departments" value={departments.size} icon={Building2} />
        <StatCard label="Total Team Leads" value={teamLeads.size} icon={UserCheck} />
        <StatCard label="Monthly Upload" value="Complete" icon={CalendarCheck2} hint={CURRENT_MONTH} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent uploads</CardTitle>
            <CardDescription>Latest data syncs to Google Sheets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { file: "performance_2026_06.xlsx", who: "Rahul Verma", when: "2 hours ago", status: "Synced" },
              { file: "performance_2026_06_underwriting.xlsx", who: "Neha Kapoor", when: "5 hours ago", status: "Synced" },
              { file: "employee_master_v3.xlsx", who: "Priya Sharma", when: "Yesterday", status: "Synced" },
            ].map((r) => (
              <div key={r.file} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{r.file}</div>
                  <div className="text-xs text-muted-foreground">{r.who} • {r.when}</div>
                </div>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Headcount by department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(departments).map((d) => {
              const count = EMPLOYEES.filter((e) => e.department === d).length;
              return (
                <div key={d} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium">{d}</span>
                  <Badge variant="outline">{count} people</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
