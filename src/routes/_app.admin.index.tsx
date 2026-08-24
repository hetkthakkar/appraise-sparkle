import { PerformanceView } from "@/components/performance-view";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, FileUp, CalendarCheck2, Download } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminOnboarding } from "@/components/admin-onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeDetailModal } from "@/components/employee-detail-modal";
import { useAuth } from "@/lib/mock-auth";
import {
  listEmployees,
  listPerformance,
  getMyDashboard,
} from "@/lib/sheetsApi";
import { exportPerformance } from "@/lib/excel";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Safely convert any value to a number.
 */
function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format decimal values consistently.
 *
 * Examples:
 * 1.021265415      -> 1.02
 * 71260.19000002   -> 71260.19
 * 0                -> 0.00
 */
function formatDecimal(value: unknown): string {
  return safeNumber(value).toFixed(2);
}

/**
 * Format whole-number metrics.
 *
 * Examples:
 * 125167.00000001 -> 125167
 * 0              -> 0
 */
function formatNumber(value: unknown): string {
  return Math.round(safeNumber(value)).toString();
}

function AdminDashboard() {
  const { user } = useAuth();
  const month = currentMonth();
  const [selected, setSelected] = useState<string | null>(null);

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled:
      !!user && ["admin", "super_admin"].includes(user.role),
  });

  const perfQ = useQuery({
    queryKey: ["performance", user?.email, month],
    queryFn: () => listPerformance(user!.email, month),
    enabled:
      !!user && ["admin", "super_admin"].includes(user.role),
  });

  const meQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled:
      !!user && ["admin", "super_admin"].includes(user.role),
  });

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" />;
  }

  if (meQ.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-2 p-6">
        <Skeleton className="h-40 w-full" />
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
      <AdminOnboarding
        me={
          me ?? {
            employeeId: "",
            name: user.name,
            email: user.email,
            department: "",
            designation: "Team Lead",
            teamLead: "",
            location: "",
            joiningDate: "",
          }
        }
      />
    );
  }

  const employees = empQ.data ?? [];

  const team = me
    ? employees.filter(
        (e) =>
          e.teamLead?.trim().toLowerCase() ===
          me.name?.trim().toLowerCase()
      )
    : employees;

  const teamPerf = (perfQ.data ?? []).filter((p) =>
    team.some(
      (t) =>
        String(t.employeeId).trim() ===
        String(p.employeeId).trim()
    )
  );

  const uploadStatus =
    perfQ.isLoading
      ? "…"
      : team.length === 0
        ? "No team"
        : teamPerf.length >= team.length
          ? "Complete"
          : teamPerf.length > 0
            ? "Partial"
            : "Pending";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Team Overview
        </h2>

        <p className="text-sm text-muted-foreground">
          {me?.department ?? "—"} • {team.length} reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Team Size"
          value={team.length}
          icon={Users}
        />

        <StatCard
          label="Current Month"
          value={month}
          icon={CalendarCheck2}
        />

        <StatCard
          label="Upload Status"
          value={uploadStatus}
          icon={FileUp}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Current month performance
            </CardTitle>

            <CardDescription>
              Snapshot of your team's {month} numbers.
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPerformance(teamPerf)
              }
              disabled={!teamPerf.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>

            <Button asChild size="sm">
              <Link to="/upload">Upload File</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {empQ.isLoading || perfQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full"
                />
              ))}
            </div>
          ) : (
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
                  <TableRow
                    key={p.employeeId}
                    onClick={() =>
                      setSelected(p.employeeId)
                    }
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {p.name}
                    </TableCell>

                    <TableCell>
                      {formatNumber(p.productionActual)} /{" "}
                      {formatNumber(p.productionTarget)}
                    </TableCell>

                    <TableCell>
                      {formatNumber(p.ticketActual)} /{" "}
                      {formatNumber(p.ticketTarget)}
                    </TableCell>

                    <TableCell>
                      {formatNumber(p.errorActual)} /{" "}
                      {formatNumber(p.errorTarget)}
                    </TableCell>

                    <TableCell>
                      {formatDecimal(p.attendance)}
                    </TableCell>

                    <TableCell>
                      {formatDecimal(p.behavior)}
                    </TableCell>
                  </TableRow>
                ))}

                {teamPerf.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No data yet for this month.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmployeeDetailModal
        employeeId={selected}
        onOpenChange={(open) =>
          !open && setSelected(null)
        }
      />
    </div>
  );
}
