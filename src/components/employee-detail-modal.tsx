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
    .replace(/\s+/g, " ");
}

function getRoleTier(designation: unknown): number {
  const value = normalizeText(designation);

  if (value.includes("manager")) return 4;

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

function samePerson(a: unknown, b: unknown): boolean {
  const strA = normalizeText(a);
  const strB = normalizeText(b);

  if (!strA || !strB) return false;
  if (strA === strB) return true;

  if (strA.includes(strB) || strB.includes(strA)) {
    return true;
  }

  const wordsA = strA
    .split(" ")
    .filter((w) => w.length > 1);

  const wordsB = strB
    .split(" ")
    .filter((w) => w.length > 1);

  if (wordsA.length >= 2 && wordsB.length >= 2) {
    if (
      wordsA[0] === wordsB[0] &&
      wordsA[wordsA.length - 1] ===
        wordsB[wordsB.length - 1]
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

function productionPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) return 0;

  const target = safeNumber(
    performance.productionTarget
  );

  const actual = safeNumber(
    performance.productionActual
  );

  if (target <= 0) return 0;

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
  if (!performance) return 0;

  const target = safeNumber(
    performance.ticketTarget
  );

  const actual = safeNumber(
    performance.ticketActual
  );

  if (target <= 0) return 0;

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
  if (!performance) return 0;

  const target = safeNumber(
    performance.errorTarget
  );

  const actual = safeNumber(
    performance.errorActual
  );

  if (target <= 0) {
    return actual <= 0 ? 100 : 0;
  }

  if (actual <= 0) return 100;

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
  if (!performance) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      (safeNumber(performance.attendance) / 10) * 100
    )
  );
}

function behaviorPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      (safeNumber(performance.behavior) / 5) * 100
    )
  );
}

function overallPercent(
  performance: SheetPerformance | null | undefined
): number {
  if (!performance) return 0;

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

function getCurrentMonthKey(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getLatestMonth(
  rows: SheetPerformance[]
): string | null {
  if (!rows.length) return null;

  const months = Array.from(
    new Set(
      rows
        .map((row) =>
          String(
            row.month ?? ""
          ).slice(0, 7)
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
        String(row.month).slice(0, 7) === month
    ) ?? null
  );
}

function getDescendants(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const result: SheetEmployee[] = [];
  const visited = new Set<string>();

  const managerId =
    String(
      manager.employeeId ?? ""
    ).trim();

  if (managerId) {
    visited.add(managerId);
  }

  function walk(parent: SheetEmployee) {
    employees.forEach(
      (employee) => {
        const id =
          String(
            employee.employeeId ?? ""
          ).trim();

        if (!id || visited.has(id)) {
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

        visited.add(id);
        result.push(employee);

        walk(employee);
      }
    );
  }

  walk(manager);

  return result;
}

function getDirectReports(
  manager: SheetEmployee,
  employees: SheetEmployee[]
): SheetEmployee[] {
  const managerTier =
    getRoleTier(
      manager.designation
    );

  return employees.filter(
    (employee) => {
      const isDirect =
        samePerson(
          employee.teamLead,
          manager.name
        ) &&
        String(employee.employeeId).trim() !==
          String(manager.employeeId).trim();

      if (!isDirect) {
        return false;
      }

      const subTier =
        getRoleTier(
          employee.designation
        );

      if (managerTier === 4) {
        return true;
      }

      if (managerTier === 3) {
        return subTier === 2;
      }

      if (managerTier === 2) {
        return subTier === 1;
      }

      return false;
    }
  );
}

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
    setActiveEmployeeId(
      employeeId
    );

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
        user.role === "super_admin" ||
        user.role === "admin"
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
        user.role === "super_admin" ||
        user.role === "admin"
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

  const directReports =
    useMemo(() => {
      if (!profile) return [];

      return getDirectReports(
        profile,
        allEmployees
      );
    }, [
      profile,
      allEmployees,
    ]);

  const teamEmployees =
    useMemo(() => {
      if (!profile) return [];

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
    }, [
      profile,
      allEmployees,
      directReports,
      tier,
    ]);

  const performanceRows =
    performanceQ.data ?? [];

  const teamMonth =
    useMemo(() => {
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
    }, [
      teamEmployees,
      performanceRows,
    ]);

  const [
    defaultTeamYear,
    defaultTeamMonthNum,
  ] = teamMonth.split("-");

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

          if (year) {
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
      ).sort((a, b) =>
        b.localeCompare(a)
      );
    }, [performanceRows]);

  const teamSummary =
    useMemo(() => {
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
        ) / rows.length;

      const behavior =
        rows.reduce(
          (sum, row) =>
            sum +
            safeNumber(
              row.behavior
            ),
          0
        ) / rows.length;

      const production =
        productionTarget > 0
          ? Math.min(
              150,
              (
                productionActual /
                productionTarget
              ) *
                100
            )
          : 0;

      const tickets =
        ticketTarget > 0
          ? Math.min(
              150,
              (
                ticketActual /
                ticketTarget
              ) *
                100
            )
          : 0;

      const quality =
        errorTarget <= 0
          ? errorActual <= 0
            ? 100
            : 0
          : errorActual <= 0
          ? 100
          : Math.min(
              150,
              (
                errorTarget /
                errorActual
              ) *
                100
            );

      const attendancePct =
        Math.min(
          100,
          (
            attendance /
            10
          ) *
            100
        );

      const behaviorPct =
        Math.min(
          100,
          (
            behavior /
            5
          ) *
            100
        );

      const overall =
        (
          production +
          tickets +
          quality +
          attendancePct +
          behaviorPct
        ) / 5;

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

        overall,
      };
    }, [
      teamEmployees,
      directReports,
      performanceRows,
      effectiveTeamMonth,
    ]);

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
      ).sort((a, b) =>
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

  const directTeamPerformance =
    useMemo(() => {
      return directReports.map(
        (employee) => {
          const subTier =
            getRoleTier(
              employee.designation
            );

          if (subTier >= 2) {
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
                (r) =>
                  subIds.has(
                    String(
                      r.employeeId
                    )
                  ) &&
                  String(
                    r.month
                  ).slice(
                    0,
                    7
                  ) ===
                    effectiveTeamMonth
              );

            if (
              subRows.length > 0
            ) {
              const pTar =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.productionTarget
                    ),
                  0
                );

              const pAct =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.productionActual
                    ),
                  0
                );

              const tTar =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.ticketTarget
                    ),
                  0
                );

              const tAct =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.ticketActual
                    ),
                  0
                );

              const eTar =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.errorTarget
                    ),
                  0
                );

              const eAct =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.errorActual
                    ),
                  0
                );

              const att =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.attendance
                    ),
                  0
                ) /
                subRows.length;

              const beh =
                subRows.reduce(
                  (s, r) =>
                    s +
                    safeNumber(
                      r.behavior
                    ),
                  0
                ) /
                subRows.length;

              const prod =
                pTar > 0
                  ? Math.round(
                      (
                        pAct /
                        pTar
                      ) *
                        100
                    )
                  : 0;

              const tick =
                tTar > 0
                  ? Math.round(
                      (
                        tAct /
                        tTar
                      ) *
                        100
                    )
                  : 0;

              const qual =
                eTar <= 0
                  ? eAct <= 0
                    ? 100
                    : 0
                  : Math.max(
                      0,
                      Math.round(
                        100 -
                          (
                            eAct /
                            eTar
                          ) *
                            100
                      )
                    );

              const attPct =
                Math.round(
                  (
                    att /
                    10
                  ) *
                    100
                );

              const behPct =
                Math.round(
                  (
                    beh /
                    5
                  ) *
                    100
                );

              const ovr =
                Math.round(
                  (
                    prod +
                    tick +
                    qual +
                    attPct +
                    behPct
                  ) /
                    5
                );

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
                } as unknown as SheetPerformance,

                calculatedOverall:
                  ovr,
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

  const handleSelectDrilldown = (
    targetEmployeeId: string
  ) => {
    if (activeEmployeeId) {
      setHistory(
        (prev) => [
          ...prev,
          activeEmployeeId,
        ]
      );
    }

    setActiveEmployeeId(
      targetEmployeeId
    );
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev =
        history[
          history.length - 1
        ];

      setHistory(
        (p) =>
          p.slice(0, -1)
      );

      setActiveEmployeeId(
        prev
      );
    }
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
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {history.length > 0 && (
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
                    (v) => !v
                  )
                }
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
              {detailQ.error instanceof
              Error
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

function ProfileSection({
  profile,
}: {
  profile: SheetEmployee;
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
            <p className="mt-1 text-sm font-bold">
              {profile.employeeId ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              NAME
            </p>
            <p className="mt-1 text-sm font-bold">
              {profile.name ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              EMAIL
            </p>
            <p className="mt-1 break-all text-sm font-bold">
              {profile.email ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DEPARTMENT
            </p>
            <p className="mt-1 text-sm font-bold">
              {profile.department ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DESIGNATION
            </p>
            <p className="mt-1 text-sm font-bold">
              {profile.designation ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              TEAM LEAD
            </p>
            <p className="mt-1 text-sm font-bold">
              {profile.teamLead ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              LOCATION
            </p>
            <p className="mt-1 text-sm font-bold">
              {profile.location ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              JOINING DATE
            </p>
            <p className="mt-1 text-sm font-bold">
              {formatJoiningDate(
                profile.joiningDate
              )}
            </p>
          </div>
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
    performance:
      | SheetPerformance
      | null;
    calculatedOverall?: number;
  }[];

  teamMonth: string;
  teamYear: string;
  teamMonthNum: string;
  availableTeamYears: string[];

  onTeamYearChange:
    (year: string) => void;

  onTeamMonthChange:
    (month: string) => void;

  performanceLoading: boolean;

  onSelectMember?:
    (id: string) => void;
}) {
  const isHigherLead =
    tier >= 3;

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold">
              Team
            </CardTitle>

            <CardDescription className="text-xs text-muted-foreground">
              {isHigherLead
                ? `Direct leads reporting to ${profile.name} are shown here.`
                : `Employees reporting to ${profile.name}.`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={
                teamMonthNum
              }
              onValueChange={
                onTeamMonthChange
              }
            >
              <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>

              <SelectContent>
                {MONTH_OPTIONS.map(
                  (m) => (
                    <SelectItem
                      key={
                        m.value
                      }
                      value={
                        m.value
                      }
                      className="text-xs"
                    >
                      {
                        m.label
                      }
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={
                teamYear
              }
              onValueChange={
                onTeamYearChange
              }
            >
              <SelectTrigger className="h-8 w-[90px] bg-background text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>

              <SelectContent>
                {availableTeamYears.map(
                  (y) => (
                    <SelectItem
                      key={y}
                      value={y}
                      className="text-xs"
                    >
                      {y}
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
            {Array.from(
              {
                length: 6,
              }
            ).map(
              (_, index) => (
                <Skeleton
                  key={
                    index
                  }
                  className="h-24 w-full"
                />
              )
            )}
          </div>
        ) : teamSummary ? (
          <>
            {/* KEEP UPPER TEAM METRIC CARDS */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <TeamMetricCard
                icon={
                  <Users className="size-3.5" />
                }
                label={getSubordinateTypeLabel(
                  tier
                )}
                value={
                  directReports.length
                }
                suffix=""
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
                suffix=""
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
                suffix=""
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
                suffix=""
              />

              <TeamMetricCard
                icon={
                  <CalendarCheck className="size-3.5" />
                }
                label="ATTENDANCE"
                value={
                  teamSummary.attendance
                }
                secondaryValue={10}
                suffix=""
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
                secondaryValue={5}
                suffix=""
                decimals
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

        {/* TEAM LEADERS / TEAM MEMBERS TABLE */}
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
                ? "Click any team leader to drill down into their team performance."
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
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Name
                    </TableHead>

                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Designation
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
                            ? "cursor-pointer border-b border-border/40 hover:bg-muted/50"
                            : "border-b border-border/40 hover:bg-muted/30"
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
  const formatValue =
    (number: number) => {
      if (decimals) {
        return number.toFixed(
          1
        );
      }

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

        {secondaryValue !==
          undefined && (
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {formatValue(
              secondaryValue
            )}
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
                ).slice(0, 4) ===
                yearFilter
            );

      return [
        ...filtered,
      ].sort(
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

            <CardDescription className="text-xs text-muted-foreground">
              Monthly performance history.
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
                    Errors / Rejections
                  </TableHead>

                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Attendance
                  </TableHead>

                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Behavior
                  </TableHead>

                  <TableHead className="text-xs font-semibold text-muted-foreground">
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
                        key={
                          month
                        }
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
          await Promise.all(
            [
              qc.refetchQueries(
                {
                  queryKey: [
                    "employeeDetail",
                    employeeId,
                  ],
                }
              ),

              qc.refetchQueries(
                {
                  queryKey: [
                    "employees",
                  ],
                }
              ),

              qc.refetchQueries(
                {
                  queryKey: [
                    "performance",
                  ],
                }
              ),

              qc.refetchQueries(
                {
                  queryKey: [
                    "teamLeads",
                  ],
                }
              ),
            ]
          );

          toast.success(
            "Employee updated"
          );

          onDone();
        },

      onError: (
        error
      ) => {
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
                      event
                        .target
                        .value
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
                  value={
                    email
                  }
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event
                        .target
                        .value
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
              deptQ.data ??
              []
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
              desigQ.data ??
              []
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
              leadQ.data ??
              []
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
              locQ.data ??
              []
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
                  event
                    .target
                    .value
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
          options ??
          []
        )
          .map(
            (option) =>
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
                key={
                  option
                }
                value={
                  option
                }
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
