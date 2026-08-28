import { useMemo, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileUp, CalendarCheck2, Download } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminOnboarding } from "@/components/admin-onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeDetailModal, getRoleTier } from "@/components/employee-detail-modal";
import { RatingBadge } from "@/components/performance-view";
import { useAuth } from "@/lib/mock-auth";
import {
  listEmployees,
  listPerformance,
  getMyDashboard,
  type SheetEmployee,
  type SheetPerformance,
} from "@/lib/sheetsApi";
import { exportPerformance } from "@/lib/excel";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[._\-]/g, " ")
    .replace(/\s+/g, " ");
}

function samePerson(a: unknown, b: unknown): boolean {
  const strA = normalizeText(a);
  const strB = normalizeText(b);

  if (!strA || !strB) return false;
  if (strA === strB) return true;

  if (strA.includes(strB) || strB.includes(strA)) {
    return true;
  }

  const wordsA = strA.split(" ").filter((w) => w.length > 1);
  const wordsB = strB.split(" ").filter((w) => w.length > 1);

  if (wordsA.length >= 2 && wordsB.length >= 2) {
    if (
      wordsA[0] === wordsB[0] &&
      wordsA[wordsA.length - 1] === wordsB[wordsB.length - 1]
    ) {
      return true;
    }
  }

  return false;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatScore(val: number | string | undefined | null, maxDecimals = 2): string {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0";
  return parseFloat(n.toFixed(maxDecimals)).toString();
}

function getDescendants(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const result: SheetEmployee[] = [];
  const visited = new Set<string>();
  const managerId = String(manager.employeeId ?? "").trim();

  if (managerId) {
    visited.add(managerId);
  }

  function walk(parent: SheetEmployee) {
    employees.forEach((employee) => {
      const id = String(employee.employeeId ?? "").trim();
      if (!id || visited.has(id)) return;
      if (!samePerson(employee.teamLead, parent.name)) return;

      visited.add(id);
      result.push(employee);
      walk(employee);
    });
  }

  walk(manager);
  return result;
}

function AdminDashboard() {
  const { user } = useAuth();
  const month = currentMonth();
  const [selected, setSelected] = useState<string | null>(null);

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && ["admin", "super_admin"].includes(user.role),
  });

  const perfQ = useQuery({
    queryKey: ["performance", user?.email, month],
    queryFn: () => listPerformance(user!.email, month),
    enabled: !!user && ["admin", "super_admin"].includes(user.role),
  });

  const meQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user && ["admin", "super_admin"].includes(user.role),
  });

  const me = meQ.data?.profile;
  const myTier = getRoleTier(me?.designation);

  const allEmployees = empQ.data ?? [];
  const performanceRows = perfQ.data ?? [];

  // Direct Team Leaders reporting directly to this Head TL / Manager
  const directReports = useMemo(() => {
    if (!me) return allEmployees;

    const direct = allEmployees.filter(
      (e) =>
        samePerson(e.teamLead, me.name) &&
        String(e.employeeId).trim() !== String(me.employeeId).trim()
    );

    if (direct.length > 0) {
      if (myTier === 3) {
        // Head TL: show direct Team Leads (Tier 2)
        const directTLs = direct.filter((e) => getRoleTier(e.designation) === 2);
        return directTLs.length > 0 ? directTLs : direct;
      }
      return direct;
    }

    return allEmployees.filter((e) => getRoleTier(e.designation) === 2);
  }, [allEmployees, me, myTier]);

  // Aggregate all team operators' performance under each Team Leader
  const displayRows = useMemo(() => {
    return directReports.map((employee) => {
      const subTier = getRoleTier(employee.designation);

      // If Head TL / Manager, aggregate full operator downline under this TL
      if (subTier >= 2 && myTier >= 3) {
        const subDownline = getDescendants(employee, allEmployees);
        const subIds = new Set(
          (subDownline.length > 0 ? subDownline : [employee]).map((e) =>
            String(e.employeeId).trim()
          )
        );

        const subPerfRows = performanceRows.filter(
          (r) =>
            subIds.has(String(r.employeeId).trim()) &&
            String(r.month).slice(0, 7) === month
        );

        if (subPerfRows.length > 0) {
          const productionTarget = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.productionTarget),
            0
          );
          const productionActual = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.productionActual),
            0
          );
          const ticketTarget = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.ticketTarget),
            0
          );
          const ticketActual = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.ticketActual),
            0
          );
          const errorTarget = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.errorTarget),
            0
          );
          const errorActual = subPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.errorActual),
            0
          );
          const attendance =
            subPerfRows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) /
            subPerfRows.length;
          const behavior =
            subPerfRows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) /
            subPerfRows.length;

          const latestWithRating = subPerfRows.find((r) => r.performanceRating);

          return {
            employee,
            performance: {
              month,
              employeeId: employee.employeeId,
              name: employee.name,
              productionTarget,
              productionActual,
              ticketTarget,
              ticketActual,
              errorTarget,
              errorActual,
              attendance,
              behavior,
              performanceRating: latestWithRating?.performanceRating,
              ratingScore: latestWithRating?.ratingScore,
            } as SheetPerformance,
          };
        }
      }

      // Fallback if not aggregated
      const perf = performanceRows.find(
        (p) =>
          String(p.employeeId).trim() === String(employee.employeeId).trim() &&
          String(p.month).slice(0, 7) === month
      );

      return {
        employee,
        performance: perf ?? null,
      };
    });
  }, [directReports, allEmployees, performanceRows, myTier, month]);

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

  const meProfile = meQ.data?.profile;

  const needsOnboarding =
    !meProfile ||
    !meProfile.department?.trim() ||
    !meProfile.designation?.trim() ||
    !meProfile.location?.trim() ||
    !String(meProfile.joiningDate ?? "").trim();

  if (needsOnboarding) {
    return (
      <AdminOnboarding
        me={
          meProfile ?? {
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

  const hasPerformanceData = displayRows.some((r) => !!r.performance);
  const uploadStatus =
    perfQ.isLoading
      ? "…"
      : directReports.length === 0
      ? "No team"
      : hasPerformanceData
      ? "Complete"
      : "Pending";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team Overview</h2>
        <p className="text-sm text-muted-foreground">
          {me?.department ?? "—"} • {directReports.length} {myTier >= 3 ? "Team Leads" : "reports"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={myTier >= 3 ? "Team Leads" : "Team Size"}
          value={directReports.length}
          icon={Users}
        />
        <StatCard label="Current Month" value={month} icon={CalendarCheck2} />
        <StatCard label="Upload Status" value={uploadStatus} icon={FileUp} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current month performance</CardTitle>
            <CardDescription>
              {myTier >= 3
                ? `Team aggregated totals under each Team Leader for ${month}.`
                : `Snapshot of your team's ${month} numbers.`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPerformance(
                  displayRows
                    .map((r) => r.performance)
                    .filter((p): p is SheetPerformance => !!p)
                )
              }
              disabled={!hasPerformanceData}
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
                <Skeleton key={i} className="h-10 w-full" />
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
                  <TableHead>Performance Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map(({ employee, performance: p }) => (
                  <TableRow
                    key={employee.employeeId}
                    onClick={() => setSelected(employee.employeeId)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{employee.name}</span>
                        {getRoleTier(employee.designation) === 2 && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase text-secondary-foreground">
                            {normalizeText(employee.designation).includes("assistant")
                              ? "ATL"
                              : "TL"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p
                        ? `${formatScore(p.productionActual)} / ${formatScore(p.productionTarget)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {p
                        ? `${formatScore(p.ticketActual)} / ${formatScore(p.ticketTarget)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {p
                        ? `${formatScore(p.errorActual)} / ${formatScore(p.errorTarget)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {p ? `${formatScore(p.attendance, 1)}/10` : "—"}
                    </TableCell>
                    <TableCell>
                      {p ? `${formatScore(p.behavior, 1)}/5` : "—"}
                    </TableCell>
                    <TableCell>
                      <RatingBadge
                        rating={p?.performanceRating}
                        score={p?.ratingScore}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
