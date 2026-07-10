import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Users, Building2, UserCheck, MapPin } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/mock-auth";
import { useEmployees, usePerformance } from "@/lib/queries";

export const Route = createFileRoute("/_app/dashboard")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const { user } = useAuth();
  const employees = useEmployees();
  const perf = usePerformance();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  const list = employees.data ?? [];
  const departments = new Set(list.map((e) => e.department));
  const locations = new Set(list.map((e) => e.location));
  const teamLeads = new Set(list.map((e) => e.teamLead).filter((t) => t && t !== "—"));
  const latestMonth = perf.data?.[0]?.month ?? "—";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">Live snapshot across JB InfoTech.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={list.length} icon={Users} />
        <StatCard label="Departments" value={departments.size} icon={Building2} />
        <StatCard label="Team Leads" value={teamLeads.size} icon={UserCheck} />
        <StatCard label="Locations" value={locations.size} icon={MapPin} hint={latestMonth !== "—" ? `Latest month: ${latestMonth}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Headcount by department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(departments).map((d) => {
              const count = list.filter((e) => e.department === d).length;
              return (
                <div key={d} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium">{d}</span>
                  <Badge variant="outline">{count} people</Badge>
                </div>
              );
            })}
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground">No employees yet — import the Employee Master from the Upload Center.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Headcount by location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(locations).map((loc) => {
              const count = list.filter((e) => e.location === loc).length;
              return (
                <div key={loc} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium">{loc}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
            {locations.size === 0 && <p className="text-sm text-muted-foreground">No locations yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
