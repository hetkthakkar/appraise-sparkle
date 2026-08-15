import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Users,
  TrendingUp,
  Ticket,
  ShieldCheck,
  CalendarCheck,
  Brain,
  Pencil,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";

import { useAuth } from "@/lib/mock-auth";

import {
  adminUpdateEmployee,
  getEmployeeDetail,
  listDepartments,
  listDesignations,
  listEmployees,
  listLocations,
  listPerformance,
  listTeamLeads,
  monthToLabel,
  type SheetEmployee,
  type SheetPerformance,
} from "@/lib/sheetsApi";

interface Props {
  employeeId: string | null;
  onOpenChange: (open: boolean) => void;
}

interface EmployeeProfile {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  teamLead?: string;
  location?: string;
  joiningDate?: string;
}

/* ============================================================
   ROLE & DESIGNATION TIER SYSTEM
   ============================================================ */

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Hierarchy Tiers:
 * 4 = Manager
 * 3 = Head Team Leader
 * 2 = Team Leader / Assistant Team Lead / Supervisor
 * 1 = Operator / Executive / Regular User
 */
function getRoleTier(designation: unknown): number {
  const value = normalizeText(designation);
  if (value.includes("manager")) return 4;
  if (value.includes("head team leader") || value.includes("head team lead") || value === "head tl" || value.startsWith("head team")) return 3;
  if (
    value.includes("team leader") ||
    value.includes("team lead") ||
    value.includes("assistant team lead") ||
    value.includes("supervisior") ||
    value.includes("supervisor") ||
    value === "tl" ||
    value.startsWith("tl ")
  ) {
    return 2;
  }
  return 1;
}

function getSubordinateTypeLabel(tier: number): string {
  if (tier === 4) return "HEAD TLS / TEAM LEADERS";
  if (tier === 3) return "TEAM LEADERS";
  if (tier === 2) return "OPERATORS & EXECUTIVES";
  return "TEAM MEMBERS";
}

/**
 * Robust Name Matching:
 * Supports full names vs short names (e.g. "CHIRAG RAJENDRABHAI VASAVA" matches "Chirag Vasava")
 */
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

/* ============================================================
   PERCENTAGE CALCULATIONS
   ============================================================ */

function productionPercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  const target = safeNumber(performance.productionTarget);
  const actual = safeNumber(performance.productionActual);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(150, (actual / target) * 100));
}

function ticketPercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  const target = safeNumber(performance.ticketTarget);
  const actual = safeNumber(performance.ticketActual);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(150, (actual / target) * 100));
}

function qualityPercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  const target = safeNumber(performance.errorTarget);
  const actual = safeNumber(performance.errorActual);
  if (target <= 0) return actual <= 0 ? 100 : 0;
  if (actual <= 0) return 100;
  return Math.max(0, Math.min(150, (target / actual) * 100));
}

function attendancePercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  return Math.max(0, Math.min(100, (safeNumber(performance.attendance) / 10) * 100));
}

function behaviorPercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  return Math.max(0, Math.min(100, (safeNumber(performance.behavior) / 5) * 100));
}

function overallPercent(performance: SheetPerformance | null | undefined): number {
  if (!performance) return 0;
  const values = [
    productionPercent(performance),
    ticketPercent(performance),
    qualityPercent(performance),
    attendancePercent(performance),
    behaviorPercent(performance),
  ];
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLatestMonth(rows: SheetPerformance[]): string | null {
  if (!rows.length) return null;
  const months = Array.from(
    new Set(rows.map((row) => String(row.month ?? "").slice(0, 7)).filter(Boolean))
  );
  months.sort((a, b) => b.localeCompare(a));
  return months[0] ?? null;
}

function getPerformanceForMonth(
  rows: SheetPerformance[],
  employeeId: string,
  month: string
): SheetPerformance | null {
  return (
    rows.find(
      (row) =>
        String(row.employeeId).trim() === String(employeeId).trim() &&
        String(row.month).slice(0, 7) === month
    ) ?? null
  );
}

/* ============================================================
   HIERARCHY CALCULATION ENGINE
   ============================================================ */

function getDescendants(manager: SheetEmployee, employees: SheetEmployee[]): SheetEmployee[] {
  const result: SheetEmployee[] = [];
  const visited = new Set<string>();

  const managerId = String(manager.employeeId ?? "").trim();
  if (managerId) visited.add(managerId);

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

function getDirectReports(manager: SheetEmployee, employees: SheetEmployee[]): SheetEmployee[] {
  const managerTier = getRoleTier(manager.designation);

  return employees.filter((employee) => {
    const isDirect =
      samePerson(employee.teamLead, manager.name) &&
      String(employee.employeeId).trim() !== String(manager.employeeId).trim();

    if (!isDirect) return false;

    const subTier = getRoleTier(employee.designation);

    // Tier 4 (Manager) -> Direct Head TLs (Tier 3), TLs (Tier 2), or direct Staff (Tier 1)
    if (managerTier === 4) {
      return true;
    }
    // Tier 3 (Head TL) -> Direct Team Leaders / Assistant TLs only (Tier 2)
    if (managerTier === 3) {
      return subTier === 2;
    }
    // Tier 2 (TL) -> Direct Operators & Executives only (Tier 1)
    if (managerTier === 2) {
      return subTier === 1;
    }

    return false;
  });
}

/* ============================================================
   MAIN MODAL
   ============================================================ */

export function EmployeeDetailModal({ employeeId, onOpenChange }: Props) {
  const { user } = useAuth();

  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(employeeId);
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    setActiveEmployeeId(employeeId);
    setHistory([]);
    setEditing(false);
    setYearFilter("all");
  }, [employeeId]);

  const detailQ = useQuery({
    queryKey: ["employeeDetail", activeEmployeeId, user?.email],
    queryFn: () => getEmployeeDetail(user!.email, activeEmployeeId!),
    enabled: !!user && !!activeEmployeeId,
  });

  const employeesQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && !!activeEmployeeId && (user.role === "super_admin" || user.role === "admin"),
  });

  const performanceQ = useQuery({
    queryKey: ["performance", "employee-detail", user?.email],
    queryFn: () => listPerformance(user!.email),
    enabled: !!user && !!activeEmployeeId && (user.role === "super_admin" || user.role === "admin"),
  });

  const profile = detailQ.data?.profile;
  const tier = getRoleTier(profile?.designation);
  const allEmployees = employeesQ.data ?? [];

  const directReports = useMemo(() => {
    if (!profile) return [];
    return getDirectReports(profile, allEmployees);
  }, [profile, allEmployees]);

  const teamEmployees = useMemo(() => {
    if (!profile) return [];
    if (tier >= 3) return getDescendants(profile, allEmployees);
    if (tier === 2) return directReports;
    return [];
  }, [profile, allEmployees, directReports, tier]);

  const performanceRows = performanceQ.data ?? [];

  const teamMonth = useMemo(() => {
    if (!teamEmployees.length) return getCurrentMonthKey();
    const teamIds = new Set(teamEmployees.map((employee) => String(employee.employeeId)));
    const teamRows = performanceRows.filter((row) => teamIds.has(String(row.employeeId)));
    const current = getCurrentMonthKey();
    const hasCurrent = teamRows.some((row) => String(row.month).slice(0, 7) === current);
    if (hasCurrent) return current;
    return getLatestMonth(teamRows) ?? current;
  }, [teamEmployees, performanceRows]);

  const teamSummary = useMemo(() => {
    if (!teamEmployees.length) return null;

    const rows = teamEmployees
      .map((employee) => getPerformanceForMonth(performanceRows, employee.employeeId, teamMonth))
      .filter((row): row is SheetPerformance => !!row);

    if (!rows.length) return null;

    const productionTarget = rows.reduce((sum, row) => sum + safeNumber(row.productionTarget), 0);
    const productionActual = rows.reduce((sum, row) => sum + safeNumber(row.productionActual), 0);
    const ticketTarget = rows.reduce((sum, row) => sum + safeNumber(row.ticketTarget), 0);
    const ticketActual = rows.reduce((sum, row) => sum + safeNumber(row.ticketActual), 0);
    const errorTarget = rows.reduce((sum, row) => sum + safeNumber(row.errorTarget), 0);
    const errorActual = rows.reduce((sum, row) => sum + safeNumber(row.errorActual), 0);
    const attendance = rows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) / rows.length;
    const behavior = rows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) / rows.length;

    const production = productionTarget > 0 ? Math.min(150, (productionActual / productionTarget) * 100) : 0;
    const tickets = ticketTarget > 0 ? Math.min(150, (ticketActual / ticketTarget) * 100) : 0;
    const quality =
      errorTarget <= 0
        ? errorActual <= 0 ? 100 : 0
        : errorActual <= 0 ? 100 : Math.min(150, (errorTarget / errorActual) * 100);

    const attendancePct = Math.min(100, (attendance / 10) * 100);
    const behaviorPct = Math.min(100, (behavior / 5) * 100);
    const overall = (production + tickets + quality + attendancePct + behaviorPct) / 5;

    return {
      people: directReports.length,
      employeesWithPerformance: rows.length,
      productionActual,
      productionTarget,
      ticketActual,
      ticketTarget,
      errorActual,
      errorTarget,
      attendance,
      behavior,
      overall,
    };
  }, [teamEmployees, directReports, performanceRows, teamMonth]);

  const currentPerformance = detailQ.data?.currentMonth ?? null;
  const previousMonths = detailQ.data?.previousMonths ?? [];

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    previousMonths.forEach((p) => {
      if (p.month) {
        const y = String(p.month).slice(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [previousMonths]);

  const filteredPreviousMonths = useMemo(() => {
    if (yearFilter === "all") return previousMonths;
    return previousMonths.filter((p) => String(p.month ?? "").startsWith(yearFilter));
  }, [previousMonths, yearFilter]);

  const directTeamPerformance = useMemo(() => {
    return directReports.map((employee) => {
      const subTier = getRoleTier(employee.designation);

      // If subordinate is a lead (Head TL or TL), compute their entire team's average performance
      if (subTier >= 2) {
        const subDownline = getDescendants(employee, allEmployees);
        const subIds = new Set(subDownline.map((e) => String(e.employeeId)));
        const subRows = performanceRows.filter(
          (r) => subIds.has(String(r.employeeId)) && String(r.month).slice(0, 7) === teamMonth
        );

        if (subRows.length > 0) {
          const pTar = subRows.reduce((s, r) => s + safeNumber(r.productionTarget), 0);
          const pAct = subRows.reduce((s, r) => s + safeNumber(r.productionActual), 0);
          const tTar = subRows.reduce((s, r) => s + safeNumber(r.ticketTarget), 0);
          const tAct = subRows.reduce((s, r) => s + safeNumber(r.ticketActual), 0);
          const eTar = subRows.reduce((s, r) => s + safeNumber(r.errorTarget), 0);
          const eAct = subRows.reduce((s, r) => s + safeNumber(r.errorActual), 0);
          const att = subRows.reduce((s, r) => s + safeNumber(r.attendance), 0) / subRows.length;
          const beh = subRows.reduce((s, r) => s + safeNumber(r.behavior), 0) / subRows.length;

          const prod = pTar > 0 ? Math.round((pAct / pTar) * 100) : 0;
          const tick = tTar > 0 ? Math.round((tAct / tTar) * 100) : 0;
          const qual = eTar <= 0 ? (eAct <= 0 ? 100 : 0) : Math.max(0, Math.round(100 - (eAct / eTar) * 100));
          const attPct = Math.round((att / 10) * 100);
          const behPct = Math.round((beh / 5) * 100);
          const ovr = Math.round((prod + tick + qual + attPct + behPct) / 5);

          return {
            employee,
            performance: {
              month: teamMonth,
              employeeId: employee.employeeId,
              productionTarget: pTar,
              productionActual: pAct,
              ticketTarget: tTar,
              ticketActual: tAct,
              errorTarget: eTar,
              errorActual: eAct,
              attendance: att,
              behavior: beh,
            } as unknown as SheetPerformance,
            calculatedOverall: ovr,
          };
        }
      }

      const performance = getPerformanceForMonth(performanceRows, employee.employeeId, teamMonth);
      return {
        employee,
        performance,
        calculatedOverall: performance ? Math.round(overallPercent(performance)) : 0,
      };
    });
  }, [directReports, allEmployees, performanceRows, teamMonth]);

  const handleSelectDrilldown = (targetEmployeeId: string) => {
    if (activeEmployeeId) {
      setHistory((prev) => [...prev, activeEmployeeId]);
    }
    setActiveEmployeeId(targetEmployeeId);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((p) => p.slice(0, -1));
      setActiveEmployeeId(prev);
    }
  };

  const canEdit = !!user && (user.role === "super_admin" || user.role === "admin");

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              <div>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight text-foreground">
                  {profile?.name ?? "Employee detail"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Profile and employee performance history.
                </DialogDescription>
              </div>
            </div>

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setEditing((v) => !v)}
              >
                Edit details
              </Button>
            )}
          </div>
        </DialogHeader>

        {detailQ.isLoading && (
          <div className="space-y-4 px-6 py-6">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
        )}

        {detailQ.isError && (
          <div className="px-6 py-6">
            <p className="text-sm text-destructive">
              Failed to load employee details:{" "}
              {detailQ.error instanceof Error ? detailQ.error.message : String(detailQ.error)}
            </p>
          </div>
        )}

        {detailQ.data && profile && (
          <div className="space-y-6 px-6 py-6">
            {/* 1. Profile Section for All Users / Roles */}
            <ProfileSection profile={profile} />

            {/* 2. Edit Details Form (Super Admin / Admin only) */}
            {editing && (
              <EditForm
                employeeId={activeEmployeeId!}
                initial={profile}
                onDone={() => setEditing(false)}
              />
            )}

            {/* 3. Subordinates & Team Metrics Section (Only if Manager, Head TL, or TL) */}
            {tier >= 2 && (
              <TeamSection
                profile={profile}
                tier={tier}
                directReports={directReports}
                teamSummary={teamSummary}
                directTeamPerformance={directTeamPerformance}
                teamMonth={teamMonth}
                performanceLoading={performanceQ.isLoading}
                onSelectMember={handleSelectDrilldown}
              />
            )}

            {/* 4. Current Month Section (For All Users) */}
            <EmployeeCurrentMonth performance={currentPerformance} />

            {/* 5. Previous Months Section (For All Users) */}
            <EmployeePreviousMonthsTable
              performanceList={filteredPreviousMonths}
              yearFilter={yearFilter}
              onYearFilterChange={setYearFilter}
              availableYears={availableYears}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   PROFILE SECTION
   ============================================================ */

function ProfileSection({ profile }: { profile: SheetEmployee }) {
  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-foreground">Profile</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Details from the employee master.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              EMPLOYEE ID
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.employeeId || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              NAME
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.name || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              EMAIL
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.email || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DEPARTMENT
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.department || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DESIGNATION
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.designation || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              TEAM LEAD
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.teamLead || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              LOCATION
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">{profile.location || "—"}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              JOINING DATE
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              {formatJoiningDate(profile.joiningDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   TEAM & SUBORDINATES SECTION
   ============================================================ */

interface TeamSummary {
  people: number;
  employeesWithPerformance: number;
  productionActual: number;
  productionTarget: number;
  ticketActual: number;
  ticketTarget: number;
  errorActual: number;
  errorTarget: number;
  attendance: number;
  behavior: number;
  overall: number;
}

function TeamSection({
  profile,
  tier,
  directReports,
  teamSummary,
  directTeamPerformance,
  teamMonth,
  performanceLoading,
  onSelectMember,
}: {
  profile: SheetEmployee;
  tier: number;
  directReports: SheetEmployee[];
  teamSummary: TeamSummary | null;
  directTeamPerformance: {
    employee: SheetEmployee;
    performance: SheetPerformance | null;
    calculatedOverall?: number;
  }[];
  teamMonth: string;
  performanceLoading: boolean;
  onSelectMember?: (id: string) => void;
}) {
  const isHigherLead = tier >= 3;

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              {isHigherLead ? "Team Overall Performance" : "Team"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {isHigherLead
                ? `Direct leads reporting to ${profile.name} and their team performance.`
                : `Employees reporting to ${profile.name}.`}
            </CardDescription>
          </div>

          <Badge variant="secondary" className="rounded-md px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted/60">
            {monthToLabel(teamMonth)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {performanceLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : teamSummary ? (
          <>
            {/* Top Metric Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <TeamMetricCard
                icon={<Users className="size-3.5" />}
                label={getSubordinateTypeLabel(tier)}
                value={teamSummary.people}
                suffix=""
              />

              <TeamMetricCard
                icon={<TrendingUp className="size-3.5" />}
                label="PRODUCTION"
                value={teamSummary.productionActual}
                secondaryValue={teamSummary.productionTarget}
                suffix=""
              />

              <TeamMetricCard
                icon={<Ticket className="size-3.5" />}
                label="TICKETS"
                value={teamSummary.ticketActual}
                secondaryValue={teamSummary.ticketTarget}
                suffix=""
              />

              <TeamMetricCard
                icon={<ShieldCheck className="size-3.5" />}
                label="ERRORS"
                value={teamSummary.errorActual}
                secondaryValue={teamSummary.errorTarget}
                suffix=""
              />

              <TeamMetricCard
                icon={<CalendarCheck className="size-3.5" />}
                label="ATTENDANCE"
                value={teamSummary.attendance}
                secondaryValue={10}
                suffix=""
                decimals
              />

              <TeamMetricCard
                icon={<Brain className="size-3.5" />}
                label="BEHAVIOR"
                value={teamSummary.behavior}
                secondaryValue={5}
                suffix=""
                decimals
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No team performance data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No monthly performance records were found for {monthToLabel(teamMonth)}.
            </p>
          </div>
        )}

        {/* Subordinates Table with Drill-down Support */}
        <div>
          <div className="mb-3">
            <p className="text-xs font-bold text-foreground">
              {tier === 4
                ? "Head TLs & Team Leaders Under This Manager"
                : tier === 3
                  ? "Team Leaders Under This Head TL"
                  : "Team Members"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tier >= 3
                ? "Click any team leader to drill down into their team performance."
                : "Employees directly reporting to this Team Leader are shown here."}
            </p>
          </div>

          {directTeamPerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">
                No direct subordinates found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Name</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Designation</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Production</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Tickets</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Errors</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Attendance</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Behavior</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Overall</TableHead>
                    {isHigherLead && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {directTeamPerformance.map(({ employee, performance, calculatedOverall }) => {
                    const overall = calculatedOverall ?? overallPercent(performance);

                    return (
                      <TableRow
                        key={employee.employeeId}
                        className={isHigherLead ? "cursor-pointer hover:bg-muted/50 border-b border-border/40" : "border-b border-border/40 hover:bg-muted/30"}
                        onClick={() => {
                          if (isHigherLead && onSelectMember && employee.employeeId) {
                            onSelectMember(employee.employeeId);
                          }
                        }}
                      >
                        <TableCell className="font-semibold text-xs text-foreground py-3">{employee.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">{employee.designation || "—"}</TableCell>
                        <TableCell className="text-xs text-foreground py-3">
                          {performance
                            ? `${safeNumber(performance.productionActual)} / ${safeNumber(
                                performance.productionTarget
                              )}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-3">
                          {performance
                            ? `${safeNumber(performance.ticketActual)} / ${safeNumber(
                                performance.ticketTarget
                              )}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-3">
                          {performance
                            ? `${safeNumber(performance.errorActual)} / ${safeNumber(
                                performance.errorTarget
                              )}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-3">
                          {performance
                            ? `${safeNumber(performance.attendance).toFixed(1)}/10`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-3">
                          {performance
                            ? `${safeNumber(performance.behavior).toFixed(1)}/5`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground py-3">{performance ? `${Math.round(overall)}%` : "—"}</TableCell>
                        {isHigherLead && (
                          <TableCell className="py-3">
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   TEAM METRIC CARD
   ============================================================ */

function TeamMetricCard({
  icon,
  label,
  value,
  secondaryValue,
  suffix,
  decimals = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  secondaryValue?: number;
  suffix: string;
  decimals?: boolean;
}) {
  const formatValue = (number: number) => {
    if (decimals) return number.toFixed(1);
    return Math.round(number);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-none">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {formatValue(value)}
        {secondaryValue !== undefined && (
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {formatValue(secondaryValue)}
          </span>
        )}
        {suffix}
      </div>
    </div>
  );
}

/* ============================================================
   CURRENT MONTH SECTION
   ============================================================ */

function EmployeeCurrentMonth({
  performance,
}: {
  performance: SheetPerformance | null;
}) {
  const prodActual = safeNumber(performance?.productionActual);
  const prodTarget = safeNumber(performance?.productionTarget);
  const prodPct = prodTarget > 0 ? Math.min(100, Math.max(0, (prodActual / prodTarget) * 100)) : 0;

  const ticketActual = safeNumber(performance?.ticketActual);
  const ticketTarget = safeNumber(performance?.ticketTarget);
  const ticketPct = ticketTarget > 0 ? Math.min(100, Math.max(0, (ticketActual / ticketTarget) * 100)) : 0;

  const errorActual = safeNumber(performance?.errorActual);
  const errorTarget = safeNumber(performance?.errorTarget);
  const errorPct = errorTarget > 0 ? Math.min(100, Math.max(0, (errorActual / errorTarget) * 100)) : 0;

  const attendance = safeNumber(performance?.attendance);
  const behavior = safeNumber(performance?.behavior);

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Current Month — {performance?.month ? monthToLabel(performance.month) : "——"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Live snapshot of KPIs.
            </CardDescription>
          </div>

          <Badge variant="secondary" className="rounded-md px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted/60">
            Updated
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {!performance ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No performance data uploaded for this month yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Progress Bars */}
            <div className="space-y-5">
              {/* Production */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground font-bold">Production</span>
                  <span>
                    <span className="text-emerald-600 font-bold">{prodActual}</span>
                    <span className="text-muted-foreground font-normal"> / {prodTarget}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${prodPct}%` }}
                  />
                </div>
              </div>

              {/* Tickets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground font-bold">Tickets</span>
                  <span>
                    <span className="text-emerald-600 font-bold">{ticketActual}</span>
                    <span className="text-muted-foreground font-normal"> / {ticketTarget}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${ticketPct}%` }}
                  />
                </div>
              </div>

              {/* Internal Errors / Rejections */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground font-bold">Internal Errors / Rejections</span>
                  <span>
                    <span className="text-amber-600 font-bold">{errorActual}</span>
                    <span className="text-muted-foreground font-normal"> / {errorTarget}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${errorPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Attendance, Behavior & Manager Remarks */}
            <div className="space-y-3.5">
              <div className="rounded-lg border border-border/70 p-3.5 shadow-none bg-card">
                <p className="text-xs text-muted-foreground font-medium">Attendance</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  {attendance.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 10</span>
                </p>
              </div>

              <div className="rounded-lg border border-border/70 p-3.5 shadow-none bg-card">
                <p className="text-xs text-muted-foreground font-medium">Behavior</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  {behavior.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-foreground">Manager Remarks</p>
                <div className="min-h-[42px] rounded-lg border border-border/70 bg-muted/10 px-3.5 py-2.5 text-xs text-muted-foreground">
                  {performance.managerRemarks?.trim() || "—"}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   PREVIOUS MONTHS TABLE (WITH EMBEDDED YEAR FILTER)
   ============================================================ */

function EmployeePreviousMonthsTable({
  performanceList,
  yearFilter,
  onYearFilterChange,
  availableYears,
}: {
  performanceList: SheetPerformance[];
  yearFilter: string;
  onYearFilterChange: (val: string) => void;
  availableYears: string[];
}) {
  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Previous Months</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Performance history.
            </CardDescription>
          </div>

          <Select value={yearFilter} onValueChange={onYearFilterChange}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Years</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={yr} className="text-xs">{yr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {performanceList.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-xs text-muted-foreground">No history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground pl-0">Month</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Production</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Tickets</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Errors</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Attendance</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Behavior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceList.map((row, idx) => {
                  const prodAct = safeNumber(row.productionActual);
                  const prodTar = safeNumber(row.productionTarget);

                  const tickAct = safeNumber(row.ticketActual);
                  const tickTar = safeNumber(row.ticketTarget);

                  const errAct = safeNumber(row.errorActual);
                  const errTar = safeNumber(row.errorTarget);

                  const att = safeNumber(row.attendance);
                  const beh = safeNumber(row.behavior);

                  return (
                    <TableRow key={idx} className="border-b border-border/40 hover:bg-muted/30">
                      <TableCell className="text-xs font-semibold text-foreground pl-0 py-3">
                        {row.month ? monthToLabel(row.month) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {prodTar > 0 || prodAct > 0 ? `${prodAct} / ${prodTar}` : "/"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {tickTar > 0 || tickAct > 0 ? `${tickAct} / ${tickTar}` : "/"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {errTar > 0 || errAct > 0 ? `${errAct} / ${errTar}` : "/"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {att > 0 ? att.toFixed(1) : "0.0"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground py-3">
                        {beh > 0 ? beh.toFixed(1) : "0.0"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   EDIT FORM
   ============================================================ */

function EditForm({
  employeeId,
  initial,
  onDone,
}: {
  employeeId: string;
  initial: EmployeeProfile;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const deptQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const desigQ = useQuery({ queryKey: ["designations"], queryFn: listDesignations });
  const locQ = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const leadQ = useQuery({ queryKey: ["teamLeads"], queryFn: listTeamLeads });

  const [updatedEmployeeId, setUpdatedEmployeeId] = useState(
    initial.employeeId ?? employeeId
  );
  const [email, setEmail] = useState(initial.email ?? "");
  const [department, setDepartment] = useState(initial.department ?? "");
  const [designation, setDesignation] = useState(initial.designation ?? "");
  const [teamLead, setTeamLead] = useState(initial.teamLead ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [joiningDate, setJoiningDate] = useState(
    initial.joiningDate ? String(initial.joiningDate).slice(0, 10) : ""
  );

  const mutation = useMutation({
    mutationFn: () =>
      adminUpdateEmployee(user!.email, employeeId, {
        ...(user?.role === "super_admin"
          ? {
              employeeId: updatedEmployeeId,
              email,
            }
          : {}),
        department,
        designation,
        teamLead,
        location,
        joiningDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ["employeeDetail", employeeId] }),
        qc.refetchQueries({ queryKey: ["employees"] }),
        qc.refetchQueries({ queryKey: ["performance"] }),
        qc.refetchQueries({ queryKey: ["teamLeads"] }),
      ]);
      toast.success("Employee updated");
      onDone();
    },
    onError: (error) => {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      toast.error("User session not found");
      return;
    }
    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Edit Employee</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Update employee master information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          {user?.role === "super_admin" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="edit-employee-id">
                  Employee ID
                </label>
                <Input
                  id="edit-employee-id"
                  value={updatedEmployeeId}
                  onChange={(event) => setUpdatedEmployeeId(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="edit-email">
                  Email
                </label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </>
          )}

          <Picker
            label="Department"
            value={department}
            onChange={setDepartment}
            options={deptQ.data ?? []}
          />

          <Picker
            label="Designation"
            value={designation}
            onChange={setDesignation}
            options={desigQ.data ?? []}
          />

          <Picker
            label="Team Lead"
            value={teamLead}
            onChange={setTeamLead}
            options={leadQ.data ?? []}
          />

          <Picker
            label="Location"
            value={location}
            onChange={setLocation}
            options={locQ.data ?? []}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="edit-joining">
              Joining Date
            </label>
            <Input
              id="edit-joining"
              type="date"
              value={joiningDate}
              onChange={(event) => setJoiningDate(event.target.value)}
            />
          </div>

          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   PICKER
   ============================================================ */

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const uniqueOptions = Array.from(
    new Set((options ?? []).map((option) => String(option).trim()).filter(Boolean))
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>

        <SelectContent>
          {uniqueOptions.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ============================================================
   DATE
   ============================================================ */

function formatJoiningDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}
