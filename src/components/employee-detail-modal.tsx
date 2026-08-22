import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
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
   MONTH OPTIONS
   ============================================================ */

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

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/*
 * Tier:
 * 4 = Manager
 * 3 = Head Team Leader
 * 2 = Team Leader / Assistant Team Lead / Supervisor
 * 1 = Employee / Operator / Executive
 */
function getRoleTier(designation: unknown): number {
  const value = normalizeText(designation);

  if (value.includes("manager")) {
    return 4;
  }

  if (
    value.includes("head team leader") ||
    value.includes("head team lead") ||
    value === "head tl" ||
    value.startsWith("head team")
  ) {
    return 3;
  }

  if (
    value.includes("team leader") ||
    value.includes("team lead") ||
    value.includes("assistant team lead") ||
    value.includes("supervisor") ||
    value === "tl" ||
    value.startsWith("tl ")
  ) {
    return 2;
  }

  return 1;
}

function getSubordinateTypeLabel(tier: number): string {
  if (tier === 4) {
    return "HEAD TLS / TEAM LEADERS";
  }

  if (tier === 3) {
    return "TEAM LEADERS";
  }

  if (tier === 2) {
    return "TEAM MEMBERS";
  }

  return "TEAM MEMBERS";
}

function samePerson(
  a: unknown,
  b: unknown
): boolean {
  const strA = normalizeText(a);
  const strB = normalizeText(b);

  if (!strA || !strB) {
    return false;
  }

  if (strA === strB) {
    return true;
  }

  if (
    strA.includes(strB) ||
    strB.includes(strA)
  ) {
    return true;
  }

  const wordsA = strA
    .split(" ")
    .filter((word) => word.length > 1);

  const wordsB = strB
    .split(" ")
    .filter((word) => word.length > 1);

  if (
    wordsA.length >= 2 &&
    wordsB.length >= 2
  ) {
    return (
      wordsA[0] === wordsB[0] &&
      wordsA[wordsA.length - 1] ===
        wordsB[wordsB.length - 1]
    );
  }

  return false;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getCurrentMonthKey(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getLatestMonth(
  rows: SheetPerformance[]
): string | null {
  if (!rows.length) {
    return null;
  }

  const months = Array.from(
    new Set(
      rows
        .map((row) =>
          String(row.month ?? "").slice(0, 7)
        )
        .filter(Boolean)
    )
  );

  months.sort((a, b) =>
    b.localeCompare(a)
  );

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
        String(row.employeeId).trim() ===
          String(employeeId).trim() &&
        String(row.month).slice(0, 7) ===
          month
    ) ?? null
  );
}

/* ============================================================
   PERCENTAGE CALCULATIONS
   ============================================================ */

function productionPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  const target = safeNumber(
    performance.productionTarget
  );

  const actual = safeNumber(
    performance.productionActual
  );

  if (target <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      150,
      (actual / target) * 100
    )
  );
}

function ticketPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  const target = safeNumber(
    performance.ticketTarget
  );

  const actual = safeNumber(
    performance.ticketActual
  );

  if (target <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      150,
      (actual / target) * 100
    )
  );
}

function qualityPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  const target = safeNumber(
    performance.errorTarget
  );

  const actual = safeNumber(
    performance.errorActual
  );

  if (target <= 0) {
    return actual <= 0 ? 100 : 0;
  }

  if (actual <= 0) {
    return 100;
  }

  return Math.max(
    0,
    Math.min(
      150,
      (target / actual) * 100
    )
  );
}

function attendancePercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (safeNumber(
        performance.attendance
      ) /
        10) *
        100
    )
  );
}

function behaviorPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (safeNumber(
        performance.behavior
      ) /
        5) *
        100
    )
  );
}

function overallPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) {
    return 0;
  }

  const values = [
    productionPercent(performance),
    ticketPercent(performance),
    qualityPercent(performance),
    attendancePercent(performance),
    behaviorPercent(performance),
  ];

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

/* ============================================================
   HIERARCHY
   ============================================================ */

function getDescendants(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const result: SheetEmployee[] = [];
  const visited = new Set<string>();

  const managerId = String(
    manager.employeeId ?? ""
  ).trim();

  if (managerId) {
    visited.add(managerId);
  }

  function walk(
    parent: SheetEmployee
  ) {
    employees.forEach(
      (employee) => {
        const employeeId = String(
          employee.employeeId ?? ""
        ).trim();

        if (
          !employeeId ||
          visited.has(employeeId)
        ) {
          return;
        }

        if (
          !samePerson(
            employee.teamLead,
            parent.name
          )
        ) {
          return;
        }

        visited.add(employeeId);
        result.push(employee);

        walk(employee);
      }
    );
  }

  walk(manager);

  return result;
}

/*
 * IMPORTANT:
 * This returns ONLY direct reports.
 *
 * Head TL:
 *   -> only TLs directly under Head TL
 *
 * TL:
 *   -> only operators directly under TL
 *
 * This is what controls the People count and the visible
 * direct-subordinate table.
 */
function getDirectReports(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const managerTier =
    getRoleTier(manager.designation);

  return employees.filter(
    (employee) => {
      const isDirect =
        samePerson(
          employee.teamLead,
          manager.name
        ) &&
        String(
          employee.employeeId
        ).trim() !==
          String(
            manager.employeeId
          ).trim();

      if (!isDirect) {
        return false;
      }

      const subordinateTier =
        getRoleTier(
          employee.designation
        );

      // Manager -> direct Head TL / TL / staff
      if (managerTier === 4) {
        return true;
      }

      // Head TL -> ONLY direct TLs
      if (managerTier === 3) {
        return subordinateTier === 2;
      }

      // TL -> ONLY direct team members
      if (managerTier === 2) {
        return subordinateTier === 1;
      }

      return false;
    }
  );
}

/* ============================================================
   MAIN MODAL
   ============================================================ */

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();

  const [
    activeEmployeeId,
    setActiveEmployeeId,
  ] = useState<string | null>(
    employeeId
  );

  const [history, setHistory] =
    useState<string[]>([]);

  const [editing, setEditing] =
    useState(false);

  const [
    selectedTeamYear,
    setSelectedTeamYear,
  ] = useState<string | null>(null);

  const [
    selectedTeamMonthNum,
    setSelectedTeamMonthNum,
  ] = useState<string | null>(null);

  useEffect(() => {
    setActiveEmployeeId(employeeId);
    setHistory([]);
    setEditing(false);
    setSelectedTeamYear(null);
    setSelectedTeamMonthNum(null);
  }, [employeeId]);

  const detailQ = useQuery({
    queryKey: [
      "employeeDetail",
      activeEmployeeId,
      user?.email,
    ],

    queryFn: () =>
      getEmployeeDetail(
        user!.email,
        activeEmployeeId!
      ),

    enabled:
      !!user &&
      !!activeEmployeeId,
  });

  const employeesQ = useQuery({
    queryKey: [
      "employees",
      user?.email,
    ],

    queryFn: () =>
      listEmployees(
        user!.email
      ),

    enabled:
      !!user &&
      !!activeEmployeeId &&
      (
        user.role ===
          "super_admin" ||
        user.role ===
          "admin"
      ),
  });

  const performanceQ = useQuery({
    queryKey: [
      "performance",
      "employee-detail",
      user?.email,
    ],

    queryFn: () =>
      listPerformance(
        user!.email
      ),

    enabled:
      !!user &&
      !!activeEmployeeId &&
      (
        user.role ===
          "super_admin" ||
        user.role ===
          "admin"
      ),
  });

  const profile =
    detailQ.data?.profile;

  const tier =
    getRoleTier(
      profile?.designation
    );

  const allEmployees =
    employeesQ.data ?? [];

  const directReports = useMemo(
    () => {
      if (!profile) {
        return [];
      }

      return getDirectReports(
        profile,
        allEmployees
      );
    },
    [
      profile,
      allEmployees,
    ]
  );

  /*
   * Full recursive team.
   * Used for team KPI calculations only.
   */
  const teamEmployees = useMemo(
    () => {
      if (!profile) {
        return [];
      }

      if (tier >= 3) {
        return getDescendants(
          profile,
          allEmployees
        );
      }

      if (tier === 2) {
        return directReports;
      }

      return [];
    },
    [
      profile,
      allEmployees,
      directReports,
      tier,
    ]
  );

  const performanceRows =
    performanceQ.data ?? [];

  const teamMonth = useMemo(
    () => {
      if (!teamEmployees.length) {
        return getCurrentMonthKey();
      }

      const teamIds =
        new Set(
          teamEmployees.map(
            (employee) =>
              String(
                employee.employeeId
              )
          )
        );

      const teamRows =
        performanceRows.filter(
          (row) =>
            teamIds.has(
              String(
                row.employeeId
              )
            )
        );

      const current =
        getCurrentMonthKey();

      const hasCurrent =
        teamRows.some(
          (row) =>
            String(
              row.month
            ).slice(0, 7) ===
            current
        );

      if (hasCurrent) {
        return current;
      }

      return (
        getLatestMonth(
          teamRows
        ) ?? current
      );
    },
    [
      teamEmployees,
      performanceRows,
    ]
  );

  const [
    defaultTeamYear,
    defaultTeamMonthNum,
  ] =
    teamMonth.split("-");

  const effectiveTeamYear =
    selectedTeamYear ??
    defaultTeamYear;

  const effectiveTeamMonthNum =
    selectedTeamMonthNum ??
    defaultTeamMonthNum;

  const effectiveTeamMonth =
    `${effectiveTeamYear}-${effectiveTeamMonthNum}`;

  const availableTeamYears =
    useMemo(() => {
      const years =
        new Set<string>();

      performanceRows.forEach(
        (row) => {
          const year =
            String(
              row.month ?? ""
            ).slice(0, 4);

          if (
            /^\d{4}$/.test(
              year
            )
          ) {
            years.add(year);
          }
        }
      );

      years.add(
        String(
          new Date().getFullYear()
        )
      );

      return Array.from(
        years
      ).sort(
        (a, b) =>
          b.localeCompare(a)
      );
    }, [performanceRows]);

  /*
   * TEAM SUMMARY
   *
   * IMPORTANT:
   * people = directReports.length
   *
   * So a Head TL with 7 direct TLs will show:
   * PEOPLE = 7
   *
   * The KPI calculations themselves can use the entire
   * descendant hierarchy.
   */
  const teamSummary = useMemo(
    () => {
      if (!teamEmployees.length) {
        return null;
      }

      const rows =
        teamEmployees
          .map(
            (employee) =>
              getPerformanceForMonth(
                performanceRows,
                employee.employeeId,
                effectiveTeamMonth
              )
          )
          .filter(
            (
              row
            ): row is SheetPerformance =>
              !!row
          );

      if (!rows.length) {
        return null;
      }

      const productionTarget =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.productionTarget
            ),
          0
        );

      const productionActual =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.productionActual
            ),
          0
        );

      const ticketTarget =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.ticketTarget
            ),
          0
        );

      const ticketActual =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.ticketActual
            ),
          0
        );

      const errorTarget =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.errorTarget
            ),
          0
        );

      const errorActual =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.errorActual
            ),
          0
        );

      const attendance =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.attendance
            ),
          0
        ) /
        rows.length;

      const behavior =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.behavior
            ),
          0
        ) /
        rows.length;

      return {
        people:
          directReports.length,

        employeesWithPerformance:
          rows.length,

        productionActual,
        productionTarget,

        ticketActual,
        ticketTarget,

        errorActual,
        errorTarget,

        attendance,
        behavior,
      };
    },
    [
      teamEmployees,
      directReports,
      performanceRows,
      effectiveTeamMonth,
    ]
  );

  /*
   * PERSONAL PERFORMANCE
   *
   * Current + previous months are combined into one array.
   *
   * Sorted:
   * January -> February -> ... -> December
   *
   * No separate Current Month card.
   */
  const currentPerformance =
    detailQ.data?.currentMonth ??
    null;

  const previousMonths =
    detailQ.data?.previousMonths ??
    [];

  const personalPerformance =
    useMemo(() => {
      const monthMap =
        new Map<
          string,
          SheetPerformance
        >();

      previousMonths.forEach(
        (row) => {
          const month =
            String(
              row?.month ?? ""
            ).slice(0, 7);

          if (month) {
            monthMap.set(
              month,
              row
            );
          }
        }
      );

      if (
        currentPerformance?.month
      ) {
        const month =
          String(
            currentPerformance.month
          ).slice(0, 7);

        monthMap.set(
          month,
          currentPerformance
        );
      }

      return Array.from(
        monthMap.values()
      ).sort(
        (a, b) =>
          String(
            a.month ?? ""
          ).localeCompare(
            String(
              b.month ?? ""
            )
          )
      );
    }, [
      currentPerformance,
      previousMonths,
    ]);

  const availablePerformanceYears =
    useMemo(() => {
      const years =
        new Set<string>();

      personalPerformance.forEach(
        (row) => {
          const year =
            String(
              row.month ?? ""
            ).slice(0, 4);

          if (
            /^\d{4}$/.test(
              year
            )
          ) {
            years.add(year);
          }
        }
      );

      return Array.from(
        years
      ).sort(
        (a, b) =>
          Number(a) -
          Number(b)
      );
    }, [
      personalPerformance,
    ]);

  /*
   * ONLY DIRECT SUBORDINATES ARE SHOWN IN THE TABLE.
   *
   * For Head TL:
   * only TLs directly under Head TL
   *
   * For TL:
   * only operators directly under TL
   */
  const directTeamPerformance =
    useMemo(() => {
      return directReports.map(
        (employee) => {
          const subordinateTier =
            getRoleTier(
              employee.designation
            );

          /*
           * If direct subordinate is a lead,
           * calculate that subordinate's own
           * complete team.
           */
          if (
            subordinateTier >= 2
          ) {
            const subDownline =
              getDescendants(
                employee,
                allEmployees
              );

            const subIds =
              new Set(
                subDownline.map(
                  (e) =>
                    String(
                      e.employeeId
                    )
                )
              );

            const subRows =
              performanceRows.filter(
                (row) =>
                  subIds.has(
                    String(
                      row.employeeId
                    )
                  ) &&
                  String(
                    row.month
                  ).slice(0, 7) ===
                    effectiveTeamMonth
              );

            if (
              subRows.length > 0
            ) {
              const pTar =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.productionTarget
                    ),
                  0
                );

              const pAct =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.productionActual
                    ),
                  0
                );

              const tTar =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.ticketTarget
                    ),
                  0
                );

              const tAct =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.ticketActual
                    ),
                  0
                );

              const eTar =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.errorTarget
                    ),
                  0
                );

              const eAct =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.errorActual
                    ),
                  0
                );

              const att =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.attendance
                    ),
                  0
                ) /
                subRows.length;

              const beh =
                subRows.reduce(
                  (sum, row) =>
                    sum +
                    safeNumber(
                      row.behavior
                    ),
                  0
                ) /
                subRows.length;

              return {
                employee,

                performance: {
                  month:
                    effectiveTeamMonth,

                  employeeId:
                    employee.employeeId,

                  productionTarget:
                    pTar,

                  productionActual:
                    pAct,

                  ticketTarget:
                    tTar,

                  ticketActual:
                    tAct,

                  errorTarget:
                    eTar,

                  errorActual:
                    eAct,

                  attendance:
                    att,

                  behavior:
                    beh,
                } as SheetPerformance,

                calculatedOverall:
                  0,
              };
            }
          }

          const performance =
            getPerformanceForMonth(
              performanceRows,
              employee.employeeId,
              effectiveTeamMonth
            );

          return {
            employee,
            performance,
            calculatedOverall:
              performance
                ? Math.round(
                    overallPercent(
                      performance
                    )
                  )
                : 0,
          };
        }
      );
    }, [
      directReports,
      allEmployees,
      performanceRows,
      effectiveTeamMonth,
    ]);

  const handleSelectDrilldown =
    (
      targetEmployeeId: string
    ) => {
      if (activeEmployeeId) {
        setHistory(
          (previous) => [
            ...previous,
            activeEmployeeId,
          ]
        );
      }

      setSelectedTeamYear(null);
      setSelectedTeamMonthNum(
        null
      );

      setActiveEmployeeId(
        targetEmployeeId
      );
    };

  const handleBack = () => {
    if (!history.length) {
      return;
    }

    const previous =
      history[
        history.length - 1
      ];

    setHistory(
      (current) =>
        current.slice(
          0,
          -1
        )
    );

    setSelectedTeamYear(null);
    setSelectedTeamMonthNum(
      null
    );

    setActiveEmployeeId(
      previous
    );
  };

  const canEdit =
    !!user &&
    (
      user.role ===
        "super_admin" ||
      user.role ===
        "admin"
    );

  return (
    <Dialog
      open={!!employeeId}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {history.length >
                0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={
                    handleBack
                  }
                  className="h-8 w-8"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}

              <div>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight text-foreground">
                  {profile?.name ??
                    "Employee detail"}
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
                onClick={() =>
                  setEditing(
                    (value) =>
                      !value
                  )
                }
              >
                <Pencil className="mr-1.5 size-3.5" />
                {editing
                  ? "Close editor"
                  : "Edit details"}
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
                : String(
                    detailQ.error
                  )}
            </p>
          </div>
        )}

        {detailQ.data &&
          profile && (
            <div className="space-y-6 px-6 py-6">
              <ProfileSection
                profile={
                  profile
                }
              />

              {editing && (
                <EditForm
                  employeeId={
                    activeEmployeeId!
                  }
                  initial={
                    profile
                  }
                  onDone={() =>
                    setEditing(
                      false
                    )
                  }
                />
              )}

              {tier >= 2 && (
                <TeamSection
                  profile={
                    profile
                  }
                  tier={tier}
                  directReports={
                    directReports
                  }
                  teamSummary={
                    teamSummary
                  }
                  directTeamPerformance={
                    directTeamPerformance
                  }
                  teamMonth={
                    effectiveTeamMonth
                  }
                  teamYear={
                    effectiveTeamYear
                  }
                  teamMonthNum={
                    effectiveTeamMonthNum
                  }
                  availableTeamYears={
                    availableTeamYears
                  }
                  onTeamYearChange={
                    setSelectedTeamYear
                  }
                  onTeamMonthChange={
                    setSelectedTeamMonthNum
                  }
                  performanceLoading={
                    performanceQ.isLoading
                  }
                  onSelectMember={
                    handleSelectDrilldown
                  }
                />
              )}

              <EmployeePerformanceTable
                performanceList={
                  personalPerformance
                }
                availableYears={
                  availablePerformanceYears
                }
              />
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   PROFILE
   ============================================================ */

function ProfileSection({
  profile,
}: {
  profile: SheetEmployee;
}) {
  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="px-6 pb-3 pt-5">
        <CardTitle className="text-base font-bold tracking-tight">
          Profile
        </CardTitle>

        <CardDescription className="text-xs">
          Details from the employee master.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <ProfileField
            label="EMPLOYEE ID"
            value={
              profile.employeeId
            }
          />

          <ProfileField
            label="NAME"
            value={profile.name}
          />

          <ProfileField
            label="EMAIL"
            value={profile.email}
          />

          <ProfileField
            label="DEPARTMENT"
            value={
              profile.department
            }
          />

          <ProfileField
            label="DESIGNATION"
            value={
              profile.designation
            }
          />

          <ProfileField
            label="TEAM LEAD"
            value={
              profile.teamLead
            }
          />

          <ProfileField
            label="LOCATION"
            value={
              profile.location
            }
          />

          <ProfileField
            label="JOINING DATE"
            value={formatJoiningDate(
              profile.joiningDate
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: unknown;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-foreground">
        {value
          ? String(value)
          : "—"}
      </p>
    </div>
  );
}

/* ============================================================
   TEAM
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
}

function TeamSection({
  profile,
  tier,
  directReports,
  teamSummary,
  directTeamPerformance,
  teamMonth,
  teamYear,
  teamMonthNum,
  availableTeamYears,
  onTeamYearChange,
  onTeamMonthChange,
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
  teamYear: string;
  teamMonthNum: string;
  availableTeamYears: string[];
  onTeamYearChange: (
    year: string
  ) => void;
  onTeamMonthChange: (
    month: string
  ) => void;
  performanceLoading: boolean;
  onSelectMember?: (
    id: string
  ) => void;
}) {
  const isHigherLead =
    tier >= 3;

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold">
              {isHigherLead
                ? "Team Overall Performance"
                : "Team Performance"}
            </CardTitle>

            <CardDescription className="text-xs">
              {isHigherLead
                ? `Team performance under ${profile.name}.`
                : `Employees directly reporting to ${profile.name}.`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={teamMonthNum}
              onValueChange={
                onTeamMonthChange
              }
            >
              <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>

              <SelectContent>
                {MONTH_OPTIONS.map(
                  (month) => (
                    <SelectItem
                      key={
                        month.value
                      }
                      value={
                        month.value
                      }
                      className="text-xs"
                    >
                      {
                        month.label
                      }
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={teamYear}
              onValueChange={
                onTeamYearChange
              }
            >
              <SelectTrigger className="h-8 w-[90px] bg-background text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>

              <SelectContent>
                {availableTeamYears.map(
                  (year) => (
                    <SelectItem
                      key={year}
                      value={year}
                      className="text-xs"
                    >
                      {year}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {performanceLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-24 w-full"
              />
            ))}
          </div>
        ) : teamSummary ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <TeamMetricCard
                icon={
                  <Users className="size-3.5" />
                }
                label={getSubordinateTypeLabel(
                  tier
                )}
                value={
                  teamSummary.people
                }
              />

              <TeamMetricCard
                icon={
                  <TrendingUp className="size-3.5" />
                }
                label="PRODUCTION"
                value={
                  teamSummary.productionActual
                }
                secondaryValue={
                  teamSummary.productionTarget
                }
              />

              <TeamMetricCard
                icon={
                  <Ticket className="size-3.5" />
                }
                label="TICKETS"
                value={
                  teamSummary.ticketActual
                }
                secondaryValue={
                  teamSummary.ticketTarget
                }
              />

              <TeamMetricCard
                icon={
                  <ShieldCheck className="size-3.5" />
                }
                label="ERRORS"
                value={
                  teamSummary.errorActual
                }
                secondaryValue={
                  teamSummary.errorTarget
                }
              />

              <TeamMetricCard
                icon={
                  <CalendarCheck className="size-3.5" />
                }
                label="ATTENDANCE"
                value={
                  teamSummary.attendance
                }
                secondaryValue={
                  10
                }
                decimals
              />

              <TeamMetricCard
                icon={
                  <Brain className="size-3.5" />
                }
                label="BEHAVIOR"
                value={
                  teamSummary.behavior
                }
                secondaryValue={
                  5
                }
                decimals
              />
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Overall Team Performance
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {monthToLabel(
                      teamMonth
                    )}
                  </p>
                </div>
              </div>

              <TeamActualRow
                label="Production"
                actual={
                  teamSummary.productionActual
                }
                target={
                  teamSummary.productionTarget
                }
              />

              <TeamActualRow
                label="Tickets"
                actual={
                  teamSummary.ticketActual
                }
                target={
                  teamSummary.ticketTarget
                }
              />

              <TeamActualRow
                label="Errors / Rejections"
                actual={
                  teamSummary.errorActual
                }
                target={
                  teamSummary.errorTarget
                }
              />

              <TeamScoreRow
                label="Attendance"
                value={
                  teamSummary.attendance
                }
                outOf={10}
              />

              <TeamScoreRow
                label="Behavior"
                value={
                  teamSummary.behavior
                }
                outOf={5}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">
              No team performance data available.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              No monthly performance records were found for{" "}
              {monthToLabel(
                teamMonth
              )}
              .
            </p>
          </div>
        )}

        <div>
          <div className="mb-3">
            <p className="text-xs font-bold">
              {tier === 4
                ? "Head TLs & Team Leaders Under This Manager"
                : tier === 3
                  ? "Team Leaders Under This Head TL"
                  : "Team Members"}
            </p>

            <p className="text-[11px] text-muted-foreground">
              {tier >= 3
                ? "Only direct reporting leaders are shown here."
                : "Employees directly reporting to this Team Leader are shown here."}
            </p>
          </div>

          {directTeamPerformance.length ===
          0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">
                No direct subordinates found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">
                      Name
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Designation
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Production
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Tickets
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Errors
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Attendance
                    </TableHead>

                    <TableHead className="text-xs font-semibold">
                      Behavior
                    </TableHead>

                    {isHigherLead && (
                      <TableHead className="w-10" />
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {directTeamPerformance.map(
                    ({
                      employee,
                      performance,
                    }) => (
                      <TableRow
                        key={
                          employee.employeeId
                        }
                        className={
                          isHigherLead
                            ? "cursor-pointer hover:bg-muted/50"
                            : "hover:bg-muted/30"
                        }
                        onClick={() => {
                          if (
                            isHigherLead &&
                            onSelectMember &&
                            employee.employeeId
                          ) {
                            onSelectMember(
                              employee.employeeId
                            );
                          }
                        }}
                      >
                        <TableCell className="py-3 text-xs font-semibold">
                          {
                            employee.name
                          }
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {employee.designation ||
                            "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${safeNumber(
                                performance.productionActual
                              )} / ${safeNumber(
                                performance.productionTarget
                              )}`
                            : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${safeNumber(
                                performance.ticketActual
                              )} / ${safeNumber(
                                performance.ticketTarget
                              )}`
                            : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${safeNumber(
                                performance.errorActual
                              )} / ${safeNumber(
                                performance.errorTarget
                              )}`
                            : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${safeNumber(
                                performance.attendance
                              ).toFixed(
                                1
                              )}/10`
                            : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          {performance
                            ? `${safeNumber(
                                performance.behavior
                              ).toFixed(
                                1
                              )}/5`
                            : "—"}
                        </TableCell>

                        {isHigherLead && (
                          <TableCell className="py-3">
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  )}
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
  decimals = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  secondaryValue?: number;
  decimals?: boolean;
}) {
  const formatValue = (
    number: number
  ) => {
    if (decimals) {
      return number.toFixed(1);
    }

    return Math.round(number);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>

      <div className="mt-2 text-xl font-bold tracking-tight">
        {formatValue(value)}

        {secondaryValue !==
          undefined && (
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {formatValue(
              secondaryValue
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TEAM ACTUAL ROW
   ============================================================ */

function TeamActualRow({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-medium">
          {label}
        </span>

        <span className="text-xs font-semibold">
          {safeNumber(actual)} /{" "}
          {safeNumber(target)}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   TEAM SCORE ROW
   ============================================================ */

function TeamScoreRow({
  label,
  value,
  outOf,
}: {
  label: string;
  value: number;
  outOf: number;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-medium">
          {label}
        </span>

        <span className="text-xs font-semibold">
          {safeNumber(value).toFixed(
            1
          )}{" "}
          / {outOf}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   PERSONAL PERFORMANCE TABLE
   ============================================================ */

function EmployeePerformanceTable({
  performanceList,
  availableYears,
}: {
  performanceList: SheetPerformance[];
  availableYears: string[];
}) {
  const [
    yearFilter,
    setYearFilter,
  ] = useState("all");

  const history =
    useMemo(() => {
      const filtered =
        yearFilter === "all"
          ? performanceList
          : performanceList.filter(
              (item) =>
                String(
                  item.month ?? ""
                ).slice(
                  0,
                  4
                ) ===
                yearFilter
            );

      /*
       * ASCENDING:
       * January -> December
       */
      return [...filtered].sort(
        (a, b) =>
          String(
            a.month ?? ""
          ).localeCompare(
            String(
              b.month ?? ""
            )
          )
      );
    }, [
      performanceList,
      yearFilter,
    ]);

  const currentMonthKey =
    getCurrentMonthKey();

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold">
              Personal Performance
            </CardTitle>

            <CardDescription className="text-xs">
              All monthly performance in one table.
            </CardDescription>
          </div>

          {availableYears.length >
            0 && (
            <Select
              value={yearFilter}
              onValueChange={
                setYearFilter
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Years
                </SelectItem>

                {availableYears.map(
                  (year) => (
                    <SelectItem
                      key={year}
                      value={year}
                    >
                      {year}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {history.length ===
        0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No performance data available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">
                    Month
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Production
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Tickets
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Errors / Rejections
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Attendance
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Behavior
                  </TableHead>

                  <TableHead className="text-xs font-semibold">
                    Manager Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {history.map(
                  (performance) => {
                    const month =
                      String(
                        performance.month ??
                          ""
                      ).slice(
                        0,
                        7
                      );

                    const isCurrent =
                      month ===
                      currentMonthKey;

                    return (
                      <TableRow
                        key={month}
                        className={
                          isCurrent
                            ? "bg-muted/40"
                            : undefined
                        }
                      >
                        <TableCell className="whitespace-nowrap py-3 text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span>
                              {monthToLabel(
                                month
                              )}
                            </span>

                            {isCurrent && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                Current
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3 text-xs">
                          {safeNumber(
                            performance.productionActual
                          )}{" "}
                          /{" "}
                          {safeNumber(
                            performance.productionTarget
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3 text-xs">
                          {safeNumber(
                            performance.ticketActual
                          )}{" "}
                          /{" "}
                          {safeNumber(
                            performance.ticketTarget
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3 text-xs">
                          {safeNumber(
                            performance.errorActual
                          )}{" "}
                          /{" "}
                          {safeNumber(
                            performance.errorTarget
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3 text-xs">
                          {safeNumber(
                            performance.attendance
                          ).toFixed(
                            1
                          )}
                          /10
                        </TableCell>

                        <TableCell className="whitespace-nowrap py-3 text-xs">
                          {safeNumber(
                            performance.behavior
                          ).toFixed(
                            1
                          )}
                          /5
                        </TableCell>

                        <TableCell className="min-w-[220px] max-w-[320px] py-3 text-xs text-muted-foreground">
                          {performance.managerRemarks?.trim() ||
                            "—"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
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
  const { user } =
    useAuth();

  const qc =
    useQueryClient();

  const deptQ =
    useQuery({
      queryKey: [
        "departments",
      ],
      queryFn:
        listDepartments,
    });

  const desigQ =
    useQuery({
      queryKey: [
        "designations",
      ],
      queryFn:
        listDesignations,
    });

  const locQ =
    useQuery({
      queryKey: [
        "locations",
      ],
      queryFn:
        listLocations,
    });

  const leadQ =
    useQuery({
      queryKey: [
        "teamLeads",
      ],
      queryFn:
        listTeamLeads,
    });

  const [
    updatedEmployeeId,
    setUpdatedEmployeeId,
  ] = useState(
    initial.employeeId ??
      employeeId
  );

  const [
    email,
    setEmail,
  ] = useState(
    initial.email ?? ""
  );

  const [
    department,
    setDepartment,
  ] = useState(
    initial.department ?? ""
  );

  const [
    designation,
    setDesignation,
  ] = useState(
    initial.designation ?? ""
  );

  const [
    teamLead,
    setTeamLead,
  ] = useState(
    initial.teamLead ?? ""
  );

  const [
    location,
    setLocation,
  ] = useState(
    initial.location ?? ""
  );

  const [
    joiningDate,
    setJoiningDate,
  ] = useState(
    initial.joiningDate
      ? String(
          initial.joiningDate
        ).slice(0, 10)
      : ""
  );

  const mutation =
    useMutation({
      mutationFn: () =>
        adminUpdateEmployee(
          user!.email,
          employeeId,
          {
            ...(user?.role ===
            "super_admin"
              ? {
                  employeeId:
                    updatedEmployeeId,
                  email,
                }
              : {}),

            department,
            designation,
            teamLead,
            location,
            joiningDate,
          }
        ),

      onSuccess:
        async () => {
          await Promise.all([
            qc.refetchQueries({
              queryKey: [
                "employeeDetail",
              ],
            }),

            qc.refetchQueries({
              queryKey: [
                "employees",
              ],
            }),

            qc.refetchQueries({
              queryKey: [
                "performance",
              ],
            }),

            qc.refetchQueries({
              queryKey: [
                "teamLeads",
              ],
            }),
          ]);

          toast.success(
            "Employee updated"
          );

          onDone();
        },

      onError:
        (error) => {
          toast.error(
            "Update failed",
            {
              description:
                error instanceof
                Error
                  ? error.message
                  : String(
                      error
                    ),
            }
          );
        },
    });

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      toast.error(
        "User session not found"
      );
      return;
    }

    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">
          Edit Employee
        </CardTitle>

        <CardDescription className="text-xs text-muted-foreground">
          Update employee master information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={
            handleSubmit
          }
        >
          {user?.role ===
            "super_admin" && (
            <>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  htmlFor="edit-employee-id"
                >
                  Employee ID
                </label>

                <Input
                  id="edit-employee-id"
                  value={
                    updatedEmployeeId
                  }
                  onChange={(
                    event
                  ) =>
                    setUpdatedEmployeeId(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  htmlFor="edit-email"
                >
                  Email
                </label>

                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </>
          )}

          <Picker
            label="Department"
            value={
              department
            }
            onChange={
              setDepartment
            }
            options={
              deptQ.data ?? []
            }
          />

          <Picker
            label="Designation"
            value={
              designation
            }
            onChange={
              setDesignation
            }
            options={
              desigQ.data ?? []
            }
          />

          <Picker
            label="Team Lead"
            value={
              teamLead
            }
            onChange={
              setTeamLead
            }
            options={
              leadQ.data ?? []
            }
          />

          <Picker
            label="Location"
            value={
              location
            }
            onChange={
              setLocation
            }
            options={
              locQ.data ?? []
            }
          />

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              htmlFor="edit-joining"
            >
              Joining Date
            </label>

            <Input
              id="edit-joining"
              type="date"
              value={
                joiningDate
              }
              onChange={(
                event
              ) =>
                setJoiningDate(
                  event.target.value
                )
              }
            />
          </div>

          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                onDone
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                mutation.isPending
              }
            >
              {mutation.isPending
                ? "Saving…"
                : "Save changes"}
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
  onChange: (
    value: string
  ) => void;
  options: string[];
}) {
  const uniqueOptions =
    Array.from(
      new Set(
        (
          options ?? []
        )
          .map(
            (
              option
            ) =>
              String(
                option
              ).trim()
          )
          .filter(Boolean)
      )
    );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">
        {label}
      </label>

      <Select
        value={value}
        onValueChange={
          onChange
        }
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue
            placeholder={`Select ${label.toLowerCase()}`}
          />
        </SelectTrigger>

        <SelectContent>
          {uniqueOptions.map(
            (option) => (
              <SelectItem
                key={option}
                value={option}
                className="text-xs"
              >
                {option}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ============================================================
   DATE
   ============================================================ */

function formatJoiningDate(
  value: unknown
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      String(value)
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date
    .toISOString()
    .slice(0, 10);
}
