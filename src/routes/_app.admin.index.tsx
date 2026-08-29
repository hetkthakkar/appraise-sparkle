import { PerformanceView, RatingBadge } from "@/components/performance-view";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, FileUp, CalendarCheck2, Download } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminOnboarding } from "@/components/admin-onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeDetailModal, getRoleTier } from "@/components/employee-detail-modal";
import { useAuth } from "@/lib/mock-auth";
import {
  listEmployees,
  listPerformance,
  getMyDashboard,
  getEmployeeDetail,
  listKPIWeightages,
  type SheetPerformance,
  type SheetEmployee,
  type KPIWeightage,
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
  if (strA.includes(strB) || strB.includes(strA)) return true;

  const wordsA = strA.split(" ").filter((w) => w.length > 1);
  const wordsB = strB.split(" ").filter((w) => w.length > 1);

  if (wordsA.length >= 2 && wordsB.length >= 2) {
    if (wordsA[0] === wordsB[0] && wordsA[wordsA.length - 1] === wordsB[wordsB.length - 1]) {
      return true;
    }
  }

  return false;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getAchievementScoreFrontend(ratio: number): number {
  if (ratio >= 1) return 5;
  if (ratio >= 0.9) return 4;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

function getDefectScoreFrontend(actual: number, target: number): number {
  const act = Number(actual || 0);
  const tar = Number(target || 0);

  if (act <= 0) return 5.0;
  if (tar <= 0) return 0.0;
  if (act >= tar) return 0.0;

  const score = 5.0 * (1.0 - act / tar);
  return Math.max(0, Math.min(5.0, Math.round(score * 100) / 100));
}

function getRatingBandFrontend(score: number): string {
  if (score >= 4.5) return "Outstanding";
  if (score >= 4.0) return "Exceeds Expectations";
  if (score >= 3.0) return "Meets Expectations";
  if (score >= 2.0) return "Needs Improvement";
  if (score > 0) return "Unsatisfactory";
  return "—";
}

function calculateTeamRating(
  rows: SheetPerformance[],
  weightages: KPIWeightage[],
  month: string,
): { score: number; rating: string } {
  if (!rows.length) return { score: 0, rating: "—" };

  const pTar = rows.reduce((s, r) => s + safeNumber(r.productionTarget), 0);
  const pAct = rows.reduce((s, r) => s + safeNumber(r.productionActual), 0);
  const tTar = rows.reduce((s, r) => s + safeNumber(r.ticketTarget), 0);
  const tAct = rows.reduce((s, r) => s + safeNumber(r.ticketActual), 0);
  const eTar = rows.reduce((s, r) => s + safeNumber(r.errorTarget), 0);
  const eAct = rows.reduce((s, r) => s + safeNumber(r.errorActual), 0);
  const att = rows.reduce((s, r) => s + safeNumber(r.attendance), 0) / rows.length;
  const beh = rows.reduce((s, r) => s + safeNumber(r.behavior), 0) / rows.length;

  if (pTar === 0 && pAct === 0 && tTar === 0 && tAct === 0 && eTar === 0 && eAct === 0 && att === 0 && beh === 0) {
    return { score: 0, rating: "—" };
  }

  const pScore = getAchievementScoreFrontend(pTar > 0 ? pAct / pTar : pAct > 0 ? 1 : 0);
  const tScore = getDefectScoreFrontend(tAct, tTar);
  const eScore = getDefectScoreFrontend(eAct, eTar);
  const attScore = att > 0 ? getAchievementScoreFrontend(Math.max(0, Math.min(1, att / 10))) : (pAct > 0 ? 1 : 0);
  const behScore = beh > 0 ? getAchievementScoreFrontend(Math.max(0, Math.min(1, behaviorScoreRatio(beh)))) : (pAct > 0 ? 1 : 0);

  const monthKey = month.trim().toUpperCase();
  const weightObj =
    weightages.find((w) => String(w.month || "").trim().toUpperCase() === monthKey) ||
    weightages.find((w) => String(w.month || "").trim().toUpperCase() === "DEFAULT") || {
      production: 50,
      tickets: 15,
      errors: 15,
      attendance: 10,
      behavior: 10,
    };

  const weighted =
    (pScore * safeNumber(weightObj.production) +
      tScore * safeNumber(weightObj.tickets) +
      eScore * safeNumber(weightObj.errors) +
      attScore * safeNumber(weightObj.attendance) +
      behScore * safeNumber(weightObj.behavior)) /
    100;

  const score = Math.round(weighted * 100) / 100;
  return { score, rating: getRatingBandFrontend(score) };
}

function behaviorScoreRatio(beh: number) {
  return Math.max(0, Math.min(1, beh / 5));
}

function AdminDashboard() {
  const { user } = useAuth();
  const month = currentMonth();
  const [selected, setSelected] = useState<string | null>(null);

  const meQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user && ["admin", "super_admin"].includes(user.role),
  });

  const me = meQ.data?.profile;

  const detailQ = useQuery({
    queryKey: ["employeeDetail", me?.employeeId, user?.email],
    queryFn: () => getEmployeeDetail(user!.email, me!.employeeId),
    enabled: !!user && !!me?.employeeId,
  });

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

  const kpiWeightagesQ = useQuery({
    queryKey: ["kpiWeightages", user?.email],
    queryFn: () => listKPIWeightages(user!.email),
    enabled: !!user,
  });

  const myTier = getRoleTier(me?.designation);
  const directReports = detailQ.data?.directReports ?? empQ.data ?? [];
  const downline = detailQ.data?.downline ?? [];
  const performanceRows = perfQ.data ?? [];
  const kpiWeightages = kpiWeightagesQ.data ?? [];

  // For each direct report (e.g. TL under Head TL), roll up their team's monthly numbers
  const teamPerf: SheetPerformance[] = useMemo(() => {
    if (!directReports.length) return [];

    return directReports.map((emp) => {
      const subTier = getRoleTier(emp.designation);

      // If this direct report is a Team Lead under a Head TL / Manager (tier >= 3)
      if (subTier >= 2 && myTier >= 3) {
        const subTeamMembers = downline.filter(
          (d) =>
            samePerson(d.teamLead, emp.name) &&
            String(d.employeeId).trim() !== String(emp.employeeId).trim()
        );

        const subIds = new Set(
          (subTeamMembers.length > 0 ? subTeamMembers : [emp]).map((e) =>
            String(e.employeeId).trim()
          )
        );

        const memberPerfRows = performanceRows.filter((p) =>
          subIds.has(String(p.employeeId).trim())
        );

        if (memberPerfRows.length > 0) {
          const productionTarget = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.productionTarget),
            0
          );
          const productionActual = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.productionActual),
            0
          );
          const ticketTarget = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.ticketTarget),
            0
          );
          const ticketActual = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.ticketActual),
            0
          );
          const errorTarget = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.errorTarget),
            0
          );
          const errorActual = memberPerfRows.reduce(
            (sum, row) => sum + safeNumber(row.errorActual),
            0
          );
          const attendance =
            memberPerfRows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) /
            memberPerfRows.length;
          const behavior =
            memberPerfRows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) /
            memberPerfRows.length;

          const teamRating = calculateTeamRating(memberPerfRows, kpiWeightages, month);

          return {
            month,
            employeeId: emp.employeeId,
            name: emp.name,
            location: emp.location,
            productionTarget,
            productionActual,
            ticketTarget,
            ticketActual,
            errorTarget,
            errorActual,
            attendance,
            behavior,
            performanceRating: teamRating.rating,
            ratingScore: teamRating.score,
            managerRemarks: `${subTeamMembers.length} team members`,
          } as SheetPerformance;
        }
      }

      // Individual direct contributor or direct performance record
      const individualPerf = performanceRows.find(
        (p) => String(p.employeeId).trim() === String(emp.employeeId).trim()
      );

      if (individualPerf) {
        return individualPerf;
      }

      return {
        month,
        employeeId: emp.employeeId,
        name: emp.name,
        location: emp.location,
        productionTarget: 0,
        productionActual: 0,
        ticketTarget: 0,
        ticketActual: 0,
        errorTarget: 0,
        errorActual: 0,
        attendance: 0,
        behavior: 0,
        performanceRating: "—",
        ratingScore: 0,
      } as SheetPerformance;
    });
  }, [directReports, downline, performanceRows, kpiWeightages, myTier, month]);

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

  const uploadStatus =
    perfQ.isLoading
      ? "…"
      : directReports.length === 0
        ? "No team"
        : teamPerf.length >= directReports.length
          ? "Complete"
          : teamPerf.length > 0
            ? "Partial"
            : "Pending";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team Overview</h2>
        <p className="text-sm text-muted-foreground">
          {me?.department ?? "—"} • {directReports.length} {myTier >= 3 ? "team leads" : "reports"}
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
            <CardTitle>
              {myTier >= 3 ? "Team Leads' Performance" : "Current Month Performance"}
            </CardTitle>
            <CardDescription>
              {myTier >= 3
                ? `Rolled-up performance across all teams for ${month}. Click any team lead to drill down.`
                : `Snapshot of your team's ${month} numbers.`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPerformance(teamPerf)}
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
          {empQ.isLoading || perfQ.isLoading || detailQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{myTier >= 3 ? "Team Lead / Team" : "Employee"}</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Behavior</TableHead>
                  <TableHead>Performance Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerf.map((p) => (
                  <TableRow
                    key={p.employeeId}
                    onClick={() => setSelected(p.employeeId)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div>{p.name}</div>
                        {myTier >= 3 && p.managerRemarks && (
                          <div className="text-xs text-muted-foreground">
                            {p.managerRemarks}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.productionActual} / {p.productionTarget}
                    </TableCell>
                    <TableCell>
                      {p.ticketActual} / {p.ticketTarget}
                    </TableCell>
                    <TableCell>
                      {p.errorActual} / {p.errorTarget}
                    </TableCell>
                    <TableCell>{Number(p.attendance).toFixed(1)}/10</TableCell>
                    <TableCell>{Number(p.behavior).toFixed(1)}/5</TableCell>
                    <TableCell>
                      <RatingBadge rating={p.performanceRating} score={p.ratingScore} />
                    </TableCell>
                  </TableRow>
                ))}
                {teamPerf.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
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
