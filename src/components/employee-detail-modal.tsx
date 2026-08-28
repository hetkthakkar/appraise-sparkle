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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

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
  ArrowUpDown,
  Search,
  MessageSquarePlus,
  CalendarRange,
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
  updateRemarks,
  type SheetEmployee,
  type SheetPerformance,
  type TeamHierarchyNode,
} from "@/lib/sheetsApi";

import { RatingBadge } from "@/components/performance-view";

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

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[._\-]/g, " ")
    .replace(/\s+/g, " ");
}

export function getRoleTier(designation: unknown): number {
  const value = normalizeText(designation);

  if (
    value.includes("ceo") ||
    value.includes("chief executive") ||
    value.includes("director") ||
    value.includes("founder") ||
    value.includes("president") ||
    value.includes("md") ||
    value.includes("managing director") ||
    value.includes("owner")
  ) {
    return 5;
  }

  if (value.includes("manager") || value.includes("mgr")) {
    return 4;
  }

  if (
    value.includes("head team leader") ||
    value.includes("head team lead") ||
    value.includes("head tl") ||
    value.includes("htl") ||
    value.startsWith("head team")
  ) {
    return 3;
  }

  if (
    value.includes("team leader") ||
    value.includes("team lead") ||
    value.includes("assistant team lead") ||
    value.includes("asst team lead") ||
    value.includes("supervisior") ||
    value.includes("supervisor") ||
    value.includes("tl") ||
    value.includes("atl")
  ) {
    return 2;
  }

  return 1;
}

function getSubordinateTypeLabel(tier: number): string {
  if (tier >= 5) return "DIRECT MANAGERS";
  if (tier === 4) return "HEAD TLS / TEAM LEADERS";
  if (tier === 3) return "TEAM LEADERS";
  if (tier === 2) return "OPERATORS & EXECUTIVES";
  return "TEAM MEMBERS";
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

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLatestMonth(rows: SheetPerformance[]): string | null {
  if (!rows.length) return null;
  const months = Array.from(
    new Set(
      rows
        .map((row) => String(row.month ?? "").slice(0, 7))
        .filter(Boolean)
    )
  );
  months.sort((a, b) => b.localeCompare(a));
  return months[0] ?? null;
}

function extractEmployeesFromHierarchy(node: TeamHierarchyNode | null | undefined): SheetEmployee[] {
  if (!node) return [];
  const list: SheetEmployee[] = [];

  function traverse(n: TeamHierarchyNode) {
    if (n.children && n.children.length > 0) {
      n.children.forEach((child) => {
        if (child.employee && child.employee.employeeId) {
          list.push(child.employee);
        }
        traverse(child);
      });
    }
  }

  traverse(node);
  return list;
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

function getDirectReports(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const managerTier = getRoleTier(manager.designation);

  return employees.filter((employee) => {
    const isDirect =
      samePerson(employee.teamLead, manager.name) &&
      String(employee.employeeId).trim() !== String(manager.employeeId).trim();

    if (!isDirect) return false;

    const subTier = getRoleTier(employee.designation);

    if (managerTier >= 4) return true; // CEO & Managers see all direct reports
    if (managerTier === 3) return subTier === 2; // Head TL sees TLs
    if (managerTier === 2) return true; // TL sees operators

    return true;
  });
}

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(employeeId);
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const [selectedTeamYear, setSelectedTeamYear] = useState<string | null>(null);
  const [selectedTeamStartMonth, setSelectedTeamStartMonth] = useState<string | null>(null);
  const [selectedTeamEndMonth, setSelectedTeamEndMonth] = useState<string | null>(null);
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);

  const [remarkDialog, setRemarkDialog] = useState<{
    open: boolean;
    month: string;
    value: string;
  } | null>(null);

  useEffect(() => {
    setActiveEmployeeId(employeeId);
    setHistory([]);
    setEditing(false);
    setSelectedTeamYear(null);
    setSelectedTeamStartMonth(null);
    setSelectedTeamEndMonth(null);
    setIsRangeMode(false);
    setRemarkDialog(null);
  }, [employeeId]);

  const detailQ = useQuery({
    queryKey: ["employeeDetail", activeEmployeeId, user?.email],
    queryFn: () => getEmployeeDetail(user!.email, activeEmployeeId!),
    enabled: !!user && !!activeEmployeeId,
  });

  const employeesQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && !!activeEmployeeId,
  });

  const performanceQ = useQuery({
    queryKey: ["performance", "employee-detail", user?.email],
    queryFn: () => listPerformance(user!.email),
    enabled: !!user && !!activeEmployeeId,
  });

  const profile = detailQ.data?.profile;
  const tier = getRoleTier(profile?.designation);

  const hierarchyChildren = useMemo(() => {
    const hierarchyNode = detailQ.data?.team?.hierarchy;
    if (!hierarchyNode || !hierarchyNode.children) return [];
    return hierarchyNode.children.map((c) => c.employee).filter(Boolean);
  }, [detailQ.data]);

  const hierarchyDescendants = useMemo(() => {
    return extractEmployeesFromHierarchy(detailQ.data?.team?.hierarchy);
  }, [detailQ.data]);

  const allEmployees = useMemo(() => {
    const map = new Map<string, SheetEmployee>();

    (employeesQ.data ?? []).forEach((e) => {
      const id = String(e.employeeId).trim();
      if (id) map.set(id, e);
    });

    hierarchyDescendants.forEach((e) => {
      const id = String(e.employeeId).trim();
      if (id && !map.has(id)) map.set(id, e);
    });

    hierarchyChildren.forEach((e) => {
      const id = String(e.employeeId).trim();
      if (id && !map.has(id)) map.set(id, e);
    });

    if (profile) {
      const id = String(profile.employeeId).trim();
      if (id && !map.has(id)) map.set(id, profile);
    }

    return Array.from(map.values());
  }, [employeesQ.data, hierarchyDescendants, hierarchyChildren, profile]);

  const directReports = useMemo(() => {
    if (!profile) return [];

    if (hierarchyChildren.length > 0) {
      if (tier === 3) {
        return hierarchyChildren.filter((c) => getRoleTier(c.designation) === 2);
      }
      return hierarchyChildren;
    }

    const calculated = getDirectReports(profile, allEmployees);
    if (calculated.length > 0) return calculated;

    return allEmployees.filter(
      (e) =>
        samePerson(e.teamLead, profile.name) &&
        String(e.employeeId).trim() !== String(profile.employeeId).trim()
    );
  }, [profile, hierarchyChildren, allEmployees, tier]);

  const teamEmployees = useMemo(() => {
    if (!profile) return [];
    if (tier >= 3) return getDescendants(profile, allEmployees);
    if (tier === 2) return directReports;
    return [];
  }, [profile, allEmployees, directReports, tier]);

  const performanceRows = performanceQ.data ?? [];

  const defaultMonthKey = useMemo(() => {
    if (!teamEmployees.length) return getCurrentMonthKey();

    const teamIds = new Set(teamEmployees.map((e) => String(e.employeeId)));
    const teamRows = performanceRows.filter((row) =>
      teamIds.has(String(row.employeeId))
    );

    const current = getCurrentMonthKey();
    const hasCurrent = teamRows.some(
      (row) => String(row.month).slice(0, 7) === current
    );

    if (hasCurrent) return current;
    return getLatestMonth(teamRows) ?? current;
  }, [teamEmployees, performanceRows]);

  const [defaultYear, defaultMonthNum] = defaultMonthKey.split("-");
  const effectiveTeamYear = selectedTeamYear ?? defaultYear;
  const effectiveStartMonthNum = selectedTeamStartMonth ?? defaultMonthNum;
  const effectiveEndMonthNum = isRangeMode ? (selectedTeamEndMonth ?? effectiveStartMonthNum) : effectiveStartMonthNum;

  const availableTeamYears = useMemo(() => {
    const years = new Set<string>();
    performanceRows.forEach((row) => {
      const year = String(row.month ?? "").slice(0, 4);
      if (year) years.add(year);
    });
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [performanceRows]);

  const directTeamPerformance = useMemo(() => {
    const startKey = `${effectiveTeamYear}-${effectiveStartMonthNum.padStart(2, "0")}`;
    const endKey = `${effectiveTeamYear}-${effectiveEndMonthNum.padStart(2, "0")}`;
    const minMonth = startKey <= endKey ? startKey : endKey;
    const maxMonth = startKey <= endKey ? endKey : startKey;

    const subordinatesList = directReports.map((employee) => {
      const subTier = getRoleTier(employee.designation);

      if (subTier >= 2 && tier >= 3) {
        const subDownline = getDescendants(employee, allEmployees);
        const subIds = new Set(subDownline.map((e) => String(e.employeeId)));

        const subRows = performanceRows.filter((r) => {
          const m = String(r.month).slice(0, 7);
          return subIds.has(String(r.employeeId)) && m >= minMonth && m <= maxMonth;
        });

        if (subRows.length > 0) {
          const productionTarget = subRows.reduce((sum, row) => sum + safeNumber(row.productionTarget), 0);
          const productionActual = subRows.reduce((sum, row) => sum + safeNumber(row.productionActual), 0);
          const ticketTarget = subRows.reduce((sum, row) => sum + safeNumber(row.ticketTarget), 0);
          const ticketActual = subRows.reduce((sum, row) => sum + safeNumber(row.ticketActual), 0);
          const errorTarget = subRows.reduce((sum, row) => sum + safeNumber(row.errorTarget), 0);
          const errorActual = subRows.reduce((sum, row) => sum + safeNumber(row.errorActual), 0);
          const attendance = subRows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) / subRows.length;
          const behavior = subRows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) / subRows.length;

          const latestWithRating = subRows.find((r) => r.performanceRating);

          return {
            employee,
            performance: {
              month: minMonth === maxMonth ? minMonth : `${minMonth} to ${maxMonth}`,
              employeeId: employee.employeeId,
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
            isLeader: false,
          };
        }
      }

      const memberRows = performanceRows.filter((r) => {
        const m = String(r.month).slice(0, 7);
        return String(r.employeeId).trim() === String(employee.employeeId).trim() && m >= minMonth && m <= maxMonth;
      });

      if (memberRows.length > 0) {
        const productionTarget = memberRows.reduce((sum, row) => sum + safeNumber(row.productionTarget), 0);
        const productionActual = memberRows.reduce((sum, row) => sum + safeNumber(row.productionActual), 0);
        const ticketTarget = memberRows.reduce((sum, row) => sum + safeNumber(row.ticketTarget), 0);
        const ticketActual = memberRows.reduce((sum, row) => sum + safeNumber(row.ticketActual), 0);
        const errorTarget = memberRows.reduce((sum, row) => sum + safeNumber(row.errorTarget), 0);
        const errorActual = memberRows.reduce((sum, row) => sum + safeNumber(row.errorActual), 0);
        const attendance = memberRows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) / memberRows.length;
        const behavior = memberRows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) / memberRows.length;

        const latestWithRating = memberRows.find((r) => r.performanceRating);

        return {
          employee,
          performance: {
            month: minMonth === maxMonth ? minMonth : `${minMonth} to ${maxMonth}`,
            employeeId: employee.employeeId,
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
          isLeader: false,
        };
      }

      return {
        employee,
        performance: null,
        isLeader: false,
      };
    });

    if (tier === 2 && profile) {
      const leaderRows = performanceRows.filter((r) => {
        const m = String(r.month).slice(0, 7);
        return String(r.employeeId).trim() === String(profile.employeeId).trim() && m >= minMonth && m <= maxMonth;
      });

      let leaderPerf: SheetPerformance | null = null;
      if (leaderRows.length > 0) {
        const productionTarget = leaderRows.reduce((sum, row) => sum + safeNumber(row.productionTarget), 0);
        const productionActual = leaderRows.reduce((sum, row) => sum + safeNumber(row.productionActual), 0);
        const ticketTarget = leaderRows.reduce((sum, row) => sum + safeNumber(row.ticketTarget), 0);
        const ticketActual = leaderRows.reduce((sum, row) => sum + safeNumber(row.ticketActual), 0);
        const errorTarget = leaderRows.reduce((sum, row) => sum + safeNumber(row.errorTarget), 0);
        const errorActual = leaderRows.reduce((sum, row) => sum + safeNumber(row.errorActual), 0);
        const attendance = leaderRows.reduce((sum, row) => sum + safeNumber(row.attendance), 0) / leaderRows.length;
        const behavior = leaderRows.reduce((sum, row) => sum + safeNumber(row.behavior), 0) / leaderRows.length;

        const latestWithRating = leaderRows.find((r) => r.performanceRating);

        leaderPerf = {
          month: minMonth === maxMonth ? minMonth : `${minMonth} to ${maxMonth}`,
          employeeId: profile.employeeId,
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
        } as SheetPerformance;
      }

      const leaderItem = {
        employee: profile,
        performance: leaderPerf,
        isLeader: true,
      };

      return [leaderItem, ...subordinatesList];
    }

    return subordinatesList;
  }, [
    directReports,
    allEmployees,
    performanceRows,
    effectiveTeamYear,
    effectiveStartMonthNum,
    effectiveEndMonthNum,
    tier,
    profile,
  ]);

  const teamSummary = useMemo(() => {
    if (directTeamPerformance.length === 0) return null;

    const actualSubordinates = directTeamPerformance.filter((item) => !item.isLeader);
    const rowsToCalculate = (actualSubordinates.length > 0 ? actualSubordinates : directTeamPerformance)
      .map((item) => item.performance)
      .filter((row): row is SheetPerformance => !!row);

    if (rowsToCalculate.length === 0) return null;

    const productionActual = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.productionActual), 0);
    const productionTarget = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.productionTarget), 0);
    const ticketActual = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.ticketActual), 0);
    const ticketTarget = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.ticketTarget), 0);
    const errorActual = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.errorActual), 0);
    const errorTarget = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.errorTarget), 0);
    const attendance = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.attendance), 0) / rowsToCalculate.length;
    const behavior = rowsToCalculate.reduce((sum, row) => sum + safeNumber(row.behavior), 0) / rowsToCalculate.length;

    return {
      people: directReports.length,
      employeesWithPerformance: rowsToCalculate.length,
      productionActual,
      productionTarget,
      ticketActual,
      ticketTarget,
      errorActual,
      errorTarget,
      attendance,
      behavior,
      overall: 0,
    };
  }, [directTeamPerformance, directReports]);

  const currentPerformance = detailQ.data?.currentMonth ?? null;
  const previousMonths = detailQ.data?.previousMonths ?? [];

  const personalPerformance = useMemo(() => {
    const monthMap = new Map<string, SheetPerformance>();

    previousMonths.forEach((row) => {
      const month = String(row?.month ?? "").slice(0, 7);
      if (month) monthMap.set(month, row);
    });

    if (currentPerformance?.month) {
      const month = String(currentPerformance.month).slice(0, 7);
      monthMap.set(month, currentPerformance);
    }

    return Array.from(monthMap.values()).sort((a, b) =>
      String(a.month ?? "").localeCompare(String(b.month ?? ""))
    );
  }, [currentPerformance, previousMonths]);

  const availablePerformanceYears = useMemo(() => {
    const years = new Set<string>();
    personalPerformance.forEach((row) => {
      const year = String(row.month ?? "").slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(a) - Number(b));
  }, [personalPerformance]);

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

  const remarkMutation = useMutation({
    mutationFn: ({ month, remarks }: { month: string; remarks: string }) =>
      updateRemarks(user!.email, activeEmployeeId!, month, remarks),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({
          queryKey: ["employeeDetail", activeEmployeeId, user?.email],
        }),
        qc.refetchQueries({
          queryKey: ["performance", "employee-detail", user?.email],
        }),
      ]);
      toast.success("Manager remark saved");
      setRemarkDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to save remark", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}

              <div>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight text-foreground">
                  {profile?.name ?? "Employee detail"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
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
                <Pencil className="mr-1 size-3.5" />
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
              {detailQ.error instanceof Error
                ? detailQ.error.message
                : String(detailQ.error)}
            </p>
          </div>
        )}

        {detailQ.data && profile && (
          <div className="space-y-6 px-6 py-6">
            <ProfileSection
              profile={profile}
              canRemark={canEdit}
              onAddRemark={() =>
                setRemarkDialog({
                  open: true,
                  month: getCurrentMonthKey(),
                  value: currentPerformance?.managerRemarks ?? "",
                })
              }
            />

            {editing && (
              <EditForm
                employeeId={activeEmployeeId!}
                initial={profile}
                onDone={() => setEditing(false)}
              />
            )}

            {/* Render Team Section for CEO (Tier 5), Managers (Tier 4), Head TLs (Tier 3), and TLs (Tier 2) */}
            {tier >= 2 && (
              <TeamSection
                profile={profile}
                tier={tier}
                directReports={directReports}
                teamSummary={teamSummary}
                directTeamPerformance={directTeamPerformance}
                teamYear={effectiveTeamYear}
                teamStartMonth={effectiveStartMonthNum}
                teamEndMonth={effectiveEndMonthNum}
                isRangeMode={isRangeMode}
                availableTeamYears={availableTeamYears}
                onTeamYearChange={setSelectedTeamYear}
                onTeamStartMonthChange={setSelectedTeamStartMonth}
                onTeamEndMonthChange={setSelectedTeamEndMonth}
                onToggleRangeMode={setIsRangeMode}
                performanceLoading={performanceQ.isLoading || detailQ.isLoading}
                onSelectMember={handleSelectDrilldown}
              />
            )}

            <EmployeePerformanceTable
              performanceList={personalPerformance}
              availableYears={availablePerformanceYears}
              canRemark={canEdit}
              onEditRemark={(month, currentVal) =>
                setRemarkDialog({
                  open: true,
                  month,
                  value: currentVal,
                })
              }
            />
          </div>
        )}

        {/* ── MANAGER REMARK DIALOG ── */}
        {remarkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
              <h3 className="text-sm font-bold">Add / Edit Manager Remark</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Remark for {monthToLabel(remarkDialog.month)} ({profile?.name})
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Month</label>
                  <Select
                    value={remarkDialog.month.slice(5, 7)}
                    onValueChange={(m) =>
                      setRemarkDialog((prev) =>
                        prev
                          ? {
                              ...prev,
                              month: `${remarkDialog.month.slice(0, 4)}-${m}`,
                              value:
                                personalPerformance.find(
                                  (p) =>
                                    String(p.month).slice(0, 7) ===
                                    `${remarkDialog.month.slice(0, 4)}-${m}`
                                )?.managerRemarks ?? "",
                            }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Remarks</label>
                  <Textarea
                    className="min-h-[100px] text-xs"
                    placeholder="Write manager evaluation or feedback here…"
                    value={remarkDialog.value}
                    onChange={(e) =>
                      setRemarkDialog((prev) =>
                        prev ? { ...prev, value: e.target.value } : prev
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRemarkDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={remarkMutation.isPending}
                  onClick={() =>
                    remarkMutation.mutate({
                      month: remarkDialog.month,
                      remarks: remarkDialog.value,
                    })
                  }
                >
                  {remarkMutation.isPending ? "Saving…" : "Save Remark"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileSection({
  profile,
  canRemark,
  onAddRemark,
}: {
  profile: SheetEmployee;
  canRemark?: boolean;
  onAddRemark?: () => void;
}) {
  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="px-6 pb-3 pt-5">
        <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Profile
        </CardTitle>
        <CardDescription className="text-xs font-normal text-slate-500 dark:text-slate-400">
          Details from the employee master.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              EMPLOYEE ID
            </p>
            <p className="mt-1 text-sm font-bold">{profile.employeeId || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              NAME
            </p>
            <p className="mt-1 text-sm font-bold">{profile.name || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              EMAIL
            </p>
            <p className="mt-1 break-all text-sm font-bold">{profile.email || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DEPARTMENT
            </p>
            <p className="mt-1 text-sm font-bold">{profile.department || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DESIGNATION
            </p>
            <p className="mt-1 text-sm font-bold">{profile.designation || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              TEAM LEAD
            </p>
            <p className="mt-1 text-sm font-bold">{profile.teamLead || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              LOCATION
            </p>
            <p className="mt-1 text-sm font-bold">{profile.location || "—"}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              JOINING DATE
            </p>
            <p className="mt-1 text-sm font-bold">{formatJoiningDate(profile.joiningDate)}</p>
          </div>

          {canRemark && onAddRemark ? (
            <div className="flex flex-col justify-center">
              <button
                type="button"
                onClick={onAddRemark}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
              >
                <MessageSquarePlus className="size-4 shrink-0" />
                Add Manager Remark
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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

type TeamSortField = "name" | "designation" | "production" | "tickets" | "errors" | "attendance" | "behavior";
type SortOrder = "asc" | "desc";

function TeamSection({
  profile,
  tier,
  directReports,
  teamSummary,
  directTeamPerformance,
  teamYear,
  teamStartMonth,
  teamEndMonth,
  isRangeMode,
  availableTeamYears,
  onTeamYearChange,
  onTeamStartMonthChange,
  onTeamEndMonthChange,
  onToggleRangeMode,
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
    isLeader?: boolean;
  }[];
  teamYear: string;
  teamStartMonth: string;
  teamEndMonth: string;
  isRangeMode: boolean;
  availableTeamYears: string[];
  onTeamYearChange: (year: string) => void;
  onTeamStartMonthChange: (month: string) => void;
  onTeamEndMonthChange: (month: string) => void;
  onToggleRangeMode: (active: boolean | ((prev: boolean) => boolean)) => void;
  performanceLoading: boolean;
  onSelectMember?: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<TeamSortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: TeamSortField) => {
    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortField(null);
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const leaderRow = directTeamPerformance.find((item) => item.isLeader);
  const regularMembers = directTeamPerformance.filter((item) => !item.isLeader);

  const filteredAndSortedMembers = useMemo(() => {
    let result = [...regularMembers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.employee.name?.toLowerCase().includes(q) ||
          item.employee.designation?.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (sortField) {
          case "name":
            return sortOrder === "asc"
              ? (a.employee.name ?? "").localeCompare(b.employee.name ?? "")
              : (b.employee.name ?? "").localeCompare(a.employee.name ?? "");
          case "designation":
            return sortOrder === "asc"
              ? (a.employee.designation ?? "").localeCompare(b.employee.designation ?? "")
              : (b.employee.designation ?? "").localeCompare(a.employee.designation ?? "");
          case "production":
            valA = safeNumber(a.performance?.productionActual);
            valB = safeNumber(b.performance?.productionActual);
            break;
          case "tickets":
            valA = safeNumber(a.performance?.ticketActual);
            valB = safeNumber(b.performance?.ticketActual);
            break;
          case "errors":
            valA = safeNumber(a.performance?.errorActual);
            valB = safeNumber(b.performance?.errorActual);
            break;
          case "attendance":
            valA = safeNumber(a.performance?.attendance);
            valB = safeNumber(b.performance?.attendance);
            break;
          case "behavior":
            valA = safeNumber(a.performance?.behavior);
            valB = safeNumber(b.performance?.behavior);
            break;
        }

        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [regularMembers, searchQuery, sortField, sortOrder]);

  const rangeLabel = useMemo(() => {
    const startName = MONTH_OPTIONS.find((m) => m.value === teamStartMonth)?.label ?? teamStartMonth;
    if (!isRangeMode || teamStartMonth === teamEndMonth) {
      return `${startName} ${teamYear}`;
    }
    const endName = MONTH_OPTIONS.find((m) => m.value === teamEndMonth)?.label ?? teamEndMonth;
    return `${startName} - ${endName} ${teamYear}`;
  }, [teamStartMonth, teamEndMonth, teamYear, isRangeMode]);

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Team</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {tier >= 5
                ? `Direct reports under ${profile.name} (CEO) are shown here.`
                : tier === 4
                ? `Direct leads and team reporting to ${profile.name} are shown here.`
                : tier === 3
                ? `Team leaders reporting to ${profile.name} are shown here.`
                : `Leader and employees reporting to ${profile.name}.`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isRangeMode ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold"
              onClick={() => onToggleRangeMode((prev: boolean) => !prev)}
              title="Toggle cumulative range selection"
            >
              <CalendarRange className="mr-1.5 size-3.5" />
              {isRangeMode ? "Range Mode ON" : "Range"}
            </Button>

            <Select value={teamStartMonth} onValueChange={onTeamStartMonthChange}>
              <SelectTrigger className="h-8 w-[115px] bg-background text-xs">
                <SelectValue placeholder="From Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isRangeMode && (
              <>
                <span className="text-xs font-bold text-muted-foreground">to</span>
                <Select value={teamEndMonth} onValueChange={onTeamEndMonthChange}>
                  <SelectTrigger className="h-8 w-[115px] bg-background text-xs">
                    <SelectValue placeholder="To Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <Select value={teamYear} onValueChange={onTeamYearChange}>
              <SelectTrigger className="h-8 w-[85px] bg-background text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableTeamYears.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <TeamMetricCard
              icon={<Users className="size-3.5" />}
              label={getSubordinateTypeLabel(tier)}
              value={directReports.length}
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
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No team performance data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No monthly performance records were found for {rangeLabel}.
            </p>
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold">
                {tier >= 5
                  ? "Direct Reports Under CEO (Hardik Patel)"
                  : tier === 4
                  ? "Head TLs & Team Leaders Under This Manager"
                  : tier === 3
                  ? "Team Leaders Under This Head TL"
                  : "Team Members"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Showing performance for {rangeLabel}. Click any person to drill down into their team.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter by name / designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {directTeamPerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">No direct subordinates found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("designation")}
                    >
                      <div className="flex items-center gap-1">
                        Designation <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("production")}
                    >
                      <div className="flex items-center gap-1">
                        Production <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("tickets")}
                    >
                      <div className="flex items-center gap-1">
                        Tickets <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("errors")}
                    >
                      <div className="flex items-center gap-1">
                        Errors <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("attendance")}
                    >
                      <div className="flex items-center gap-1">
                        Attendance <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("behavior")}
                    >
                      <div className="flex items-center gap-1">
                        Behavior <ArrowUpDown className="size-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Performance Rating
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {/* Pinned Leader Row if TL */}
                  {leaderRow && (
                    <TableRow className="border-b-2 border-primary/20 bg-primary/5 font-medium">
                      <TableCell className="py-3 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{leaderRow.employee.name}</span>
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-primary">
                            {normalizeText(leaderRow.employee.designation).includes("assistant") ? "ATL" : "TL"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {leaderRow.employee.designation || "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {leaderRow.performance
                          ? `${formatScore(leaderRow.performance.productionActual)} / ${formatScore(leaderRow.performance.productionTarget)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {leaderRow.performance
                          ? `${formatScore(leaderRow.performance.ticketActual)} / ${formatScore(leaderRow.performance.ticketTarget)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {leaderRow.performance
                          ? `${formatScore(leaderRow.performance.errorActual)} / ${formatScore(leaderRow.performance.errorTarget)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {leaderRow.performance
                          ? `${formatScore(leaderRow.performance.attendance, 1)}/10`
                          : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {leaderRow.performance
                          ? `${formatScore(leaderRow.performance.behavior, 1)}/5`
                          : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        <RatingBadge
                          rating={leaderRow.performance?.performanceRating}
                          score={leaderRow.performance?.ratingScore}
                        />
                      </TableCell>
                      <TableCell className="py-3" />
                    </TableRow>
                  )}

                  {/* Subordinate Members — ALL CLICKABLE TO DRILL DOWN */}
                  {filteredAndSortedMembers.map(({ employee, performance }) => {
                    const subTier = getRoleTier(employee.designation);

                    return (
                      <TableRow
                        key={employee.employeeId}
                        className="cursor-pointer border-b border-border/40 hover:bg-muted/50"
                        onClick={() => {
                          if (onSelectMember && employee.employeeId) {
                            onSelectMember(employee.employeeId);
                          }
                        }}
                      >
                        <TableCell className="py-3 text-xs font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{employee.name}</span>
                            {subTier === 4 && (
                              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                                Manager
                              </span>
                            )}
                            {subTier === 3 && (
                              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary">
                                Head TL
                              </span>
                            )}
                            {subTier === 2 && (
                              <span className="rounded bg-secondary px-1 py-0.5 text-[8px] font-bold uppercase text-secondary-foreground">
                                {normalizeText(employee.designation).includes("assistant") ? "ATL" : "TL"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {employee.designation || "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${formatScore(performance.productionActual)} / ${formatScore(performance.productionTarget)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${formatScore(performance.ticketActual)} / ${formatScore(performance.ticketTarget)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${formatScore(performance.errorActual)} / ${formatScore(performance.errorTarget)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${formatScore(performance.attendance, 1)}/10`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${formatScore(performance.behavior, 1)}/5`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          <RatingBadge
                            rating={performance?.performanceRating}
                            score={performance?.ratingScore}
                          />
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                        </TableCell>
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

function TeamMetricCard({
  icon,
  label,
  value,
  secondaryValue,
  suffix,
  decimals = false,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
  secondaryValue?: number;
  suffix: string;
  decimals?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-none">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {formatScore(value, decimals ? 1 : 2)}
        {secondaryValue !== undefined && (
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {formatScore(secondaryValue, decimals ? 1 : 2)}
          </span>
        )}
        {suffix}
      </div>
    </div>
  );
}

function EmployeePerformanceTable({
  performanceList,
  availableYears,
  canRemark,
  onEditRemark,
}: {
  performanceList: SheetPerformance[];
  availableYears: string[];
  canRemark?: boolean;
  onEditRemark?: (month: string, currentVal: string) => void;
}) {
  const [yearFilter, setYearFilter] = useState("all");
  const currentMonthKey = getCurrentMonthKey();

  const history = useMemo(() => {
    const filtered =
      yearFilter === "all"
        ? performanceList
        : performanceList.filter(
            (item) => String(item.month ?? "").slice(0, 4) === yearFilter
          );
    return [...filtered].sort((a, b) =>
      String(a.month ?? "").localeCompare(String(b.month ?? ""))
    );
  }, [performanceList, yearFilter]);

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold">Personal Performance</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Monthly performance history.
            </CardDescription>
          </div>

          {availableYears.length > 0 && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No performance data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Month
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Production
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Tickets
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Errors
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Attendance
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Behavior
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Performance Rating
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Manager Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {history.map((performance) => {
                  const month = String(performance.month ?? "").slice(0, 7);
                  const isCurrent = month === currentMonthKey;

                  return (
                    <TableRow
                      key={month}
                      className={isCurrent ? "bg-muted/40" : undefined}
                    >
                      <TableCell className="whitespace-nowrap py-3 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{monthToLabel(month)}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Current
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        {formatScore(performance.productionActual)} /{" "}
                        {formatScore(performance.productionTarget)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        {formatScore(performance.ticketActual)} /{" "}
                        {formatScore(performance.ticketTarget)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        {formatScore(performance.errorActual)} /{" "}
                        {formatScore(performance.errorTarget)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        {formatScore(performance.attendance, 1)}/10
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        {formatScore(performance.behavior, 1)}/5
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-xs">
                        <RatingBadge
                          rating={performance.performanceRating}
                          score={performance.ratingScore}
                        />
                      </TableCell>

                      <TableCell className="min-w-[220px] max-w-[320px] py-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-muted-foreground">
                            {performance.managerRemarks?.trim() || "—"}
                          </span>
                          {canRemark && onEditRemark && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-primary"
                              onClick={() =>
                                onEditRemark(month, performance.managerRemarks ?? "")
                              }
                            >
                              <Pencil className="mr-1 size-3" />
                              Edit
                            </Button>
                          )}
                        </div>
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
          ? { employeeId: updatedEmployeeId, email }
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
                  onChange={(e) => setUpdatedEmployeeId(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setJoiningDate(e.target.value)}
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
    new Set((options ?? []).map((o) => String(o).trim()).filter(Boolean))
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {uniqueOptions.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatJoiningDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}
