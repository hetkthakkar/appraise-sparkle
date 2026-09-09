import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/mock-auth";
import {
  getMyDashboard,
  listEmployees,
  listPerformance,
  type SheetPerformance,
} from "@/lib/sheetsApi";
import { EmployeeOnboarding } from "@/components/employee-onboarding";

export const Route = createFileRoute("/_app/dashboard")({
  component: SuperAdminDashboard,
});

const ALL_LOCATIONS = "__all__";

function normalizeMonth(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  }

  return raw;
}

function monthLabel(month: string): string {
  const normalized = normalizeMonth(month);
  const match = normalized.match(/^(\d{4})-(\d{2})$/);
  if (!match) return normalized;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function inSelectedRange(month: string, fromMonth: string, toMonth: string): boolean {
  if (fromMonth && month < fromMonth) return false;
  if (toMonth && month > toMonth) return false;
  return true;
}

function aggregateByMonth(rows: SheetPerformance[]) {
  const map = new Map<
    string,
    {
      month: string;
      productionTarget: number;
      productionActual: number;
      errorTarget: number;
      errorActual: number;
    }
  >();

  rows.forEach((row) => {
    const month = normalizeMonth(row.month);
    if (!month) return;

    const current = map.get(month) ?? {
      month,
      productionTarget: 0,
      productionActual: 0,
      errorTarget: 0,
      errorActual: 0,
    };

    current.productionTarget += Number(row.productionTarget || 0);
    current.productionActual += Number(row.productionActual || 0);
    current.errorTarget += Number(row.errorTarget || 0);
    current.errorActual += Number(row.errorActual || 0);

    map.set(month, current);
  });

  return Array.from(map.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      ...row,
      label: monthLabel(row.month),
    }));
}

function SuperAdminDashboard() {
  const { user } = useAuth();

  // Universal dashboard filters: From Month -> To Month -> Year -> Location
  const [selectedYear, setSelectedYear] = useState("");
  const [rangeStartMonth, setRangeStartMonth] = useState("01");
  const [rangeEndMonth, setRangeEndMonth] = useState("12");
  const [selectedLocation, setSelectedLocation] = useState(ALL_LOCATIONS);

  const empQ = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  // No month is passed here intentionally.
  // The dashboard needs all available monthly rows so the date range filter
  // and monthly line charts can work across the complete history.
  const perfQ = useQuery({
    queryKey: ["performance", "all", user?.email],
    queryFn: () => listPerformance(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  const meQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user && user.role === "super_admin",
  });

  const employees = empQ.data ?? [];
  const performance = perfQ.data ?? [];

  const employeeLocationMap = useMemo(() => {
    const map = new Map<string, string>();

    employees.forEach((employee) => {
      const employeeId = String(employee.employeeId ?? "").trim();
      const location = String(employee.location ?? "").trim();
      if (employeeId && location) map.set(employeeId, location);
    });

    return map;
  }, [employees]);

  const locations = useMemo(() => {
    const values = new Set<string>();

    employees.forEach((employee) => {
      const location = String(employee.location ?? "").trim();
      if (location) values.add(location);
    });

    performance.forEach((row) => {
      const location = String(row.location ?? "").trim();
      if (location) values.add(location);
    });

    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [employees, performance]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        performance
          .map((row) => normalizeMonth(row.month))
          .filter(Boolean)
      )
    ).sort();
  }, [performance]);

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        availableMonths
          .map((month) => month.slice(0, 4))
          .filter((year) => /^\d{4}$/.test(year))
      )
    ).sort();
  }, [availableMonths]);

  const monthOptions = useMemo(
    () => [
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
    ],
    []
  );

  // Use the latest available year automatically until the user chooses one.
  const effectiveYear = selectedYear || availableYears[availableYears.length - 1] || "";

  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const fromMonth = useMemo(() => {
    if (!effectiveYear) return "";
    return `${effectiveYear}-${rangeStartMonth}`;
  }, [effectiveYear, rangeStartMonth]);

  const toMonth = useMemo(() => {
    if (!effectiveYear) return "";
    return `${effectiveYear}-${rangeEndMonth}`;
  }, [effectiveYear, rangeEndMonth]);


  const filteredEmployees = useMemo(() => {
    if (selectedLocation === ALL_LOCATIONS) return employees;

    return employees.filter(
      (employee) =>
        String(employee.location ?? "").trim() === selectedLocation
    );
  }, [employees, selectedLocation]);

  const filteredPerformance = useMemo(() => {
    return performance.filter((row) => {
      const month = normalizeMonth(row.month);
      const rowLocation = String(row.location ?? "").trim();
      const location =
        rowLocation ||
        employeeLocationMap.get(String(row.employeeId ?? "").trim()) ||
        "";

      if (!inSelectedRange(month, fromMonth, toMonth)) return false;

      if (
        selectedLocation !== ALL_LOCATIONS &&
        location !== selectedLocation
      ) {
        return false;
      }

      return true;
    });
  }, [
    performance,
    fromMonth,
    toMonth,
    selectedLocation,
    employeeLocationMap,
  ]);

  const chartData = useMemo(
    () => aggregateByMonth(filteredPerformance),
    [filteredPerformance]
  );

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        filteredEmployees
          .map((employee) => String(employee.department ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => {
      const isLeadA =
        a.toLowerCase() === "leadership" ||
        a.toLowerCase().startsWith("leadership ");
      const isLeadB =
        b.toLowerCase() === "leadership" ||
        b.toLowerCase().startsWith("leadership ");

      if (isLeadA && !isLeadB) return -1;
      if (!isLeadA && isLeadB) return 1;

      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [filteredEmployees]);

  const teamLeads = useMemo(() => {
    return new Set(
      filteredEmployees
        .filter((employee) => {
          const designation = String(employee.designation ?? "").toLowerCase();
          return designation.includes("lead") || designation.includes("head");
        })
        .map((employee) => employee.employeeId || employee.name)
        .filter(Boolean)
    ).size;
  }, [filteredEmployees]);

  const totalPerformanceMetrics = useMemo(() => {
    let prodActual = 0;
    let prodTarget = 0;
    let errActual = 0;
    let errTarget = 0;

    filteredPerformance.forEach((row) => {
      prodActual += Number(row.productionActual || 0);
      prodTarget += Number(row.productionTarget || 0);
      errActual += Number(row.errorActual || 0);
      errTarget += Number(row.errorTarget || 0);
    });

    const prodAchievementRate =
      prodTarget > 0 ? (prodActual / prodTarget) * 100 : 0;
    const isErrorExceeded =
      errTarget > 0 && errActual > errTarget;

    return {
      prodActual,
      prodTarget,
      prodAchievementRate,
      errActual,
      errTarget,
      isErrorExceeded,
    };
  }, [filteredPerformance]);

  const dateRangeLabel = useMemo(() => {
    const startName =
      monthOptions.find((m) => m.value === rangeStartMonth)?.label.slice(0, 3) ?? "";
    const endName =
      monthOptions.find((m) => m.value === rangeEndMonth)?.label.slice(0, 3) ?? "";
    if (rangeStartMonth === rangeEndMonth) {
      return `${startName} ${effectiveYear}`;
    }
    return `${startName} - ${endName} ${effectiveYear}`;
  }, [monthOptions, rangeStartMonth, rangeEndMonth, effectiveYear]);

  const loading = empQ.isLoading || perfQ.isLoading;
  const me = meQ.data?.profile;

  const needsOnboarding =
    !me ||
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.location?.trim() ||
    !String(me.joiningDate ?? "").trim();

  const resetFilters = () => {
    setRangeStartMonth("01");
    setRangeEndMonth("12");
    setSelectedLocation(ALL_LOCATIONS);
  };

  if (!user || user.role !== "super_admin") {
    return <Navigate to="/" />;
  }

  if (meQ.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <EmployeeOnboarding
        me={
          me ?? {
            employeeId: user.employeeId ?? "",
            name: user.name,
            email: user.email,
            department: "",
            designation: "",
            teamLead: "",
            location: "",
            joiningDate: "",
          }
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome, {user.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here's what's happening across the organisation.
        </p>
      </div>

      {/* Universal dashboard filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={rangeStartMonth}
              onValueChange={(value) => {
                setRangeStartMonth(value);
                if (value > rangeEndMonth) setRangeEndMonth(value);
              }}
            >
              <SelectTrigger className="h-10 w-[145px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">to</span>

            <Select
              value={rangeEndMonth}
              onValueChange={(value) => {
                setRangeEndMonth(value);
                if (value < rangeStartMonth) setRangeStartMonth(value);
              }}
            >
              <SelectTrigger className="h-10 w-[145px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions
                  .filter((month) => month.value >= rangeStartMonth)
                  .map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={effectiveYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-10 w-[105px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="min-w-[180px] flex-1 sm:flex-none">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-10 min-w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS}>All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={resetFilters}
              disabled={
                rangeStartMonth === "01" &&
                rangeEndMonth === "12" &&
                selectedLocation === ALL_LOCATIONS
              }
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Employees"
              value={filteredEmployees.length}
              icon={Users}
              hint={
                selectedLocation === ALL_LOCATIONS
                  ? "All locations"
                  : selectedLocation
              }
            />
            <StatCard
              label="Total Departments"
              value={departments.length}
              icon={Building2}
              hint="Based on selected location"
            />
            <StatCard
              label="Total Team Leads"
              value={teamLeads}
              icon={UserCheck}
              hint="Based on selected location"
            />
            <StatCard
              label="Production & Errors"
              valueClassName="w-full"
              value={
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prod:
                    </span>
                    <div className="flex items-baseline gap-1 text-right">
                      <span className="text-base font-bold text-foreground">
                        {Math.round(totalPerformanceMetrics.prodActual).toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        / {Math.round(totalPerformanceMetrics.prodTarget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Errors:
                    </span>
                    <div className="flex items-baseline gap-1 text-right">
                      <span
                        className={`text-base font-bold ${
                          totalPerformanceMetrics.isErrorExceeded
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {Math.round(totalPerformanceMetrics.errActual).toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        / {Math.round(totalPerformanceMetrics.errTarget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              }
              icon={Target}
              hint={
                totalPerformanceMetrics.prodTarget > 0
                  ? `${totalPerformanceMetrics.prodAchievementRate.toFixed(1)}% prod achieved • ${dateRangeLabel}`
                  : `0% achieved • ${dateRangeLabel}`
              }
            />
          </>
        )}
      </div>

      {/* Current month coverage section removed */}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Production Trend</CardTitle>
            <CardDescription>
              Monthly production target versus actual performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No production data is available for the selected filters.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        Number(value).toLocaleString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="productionTarget"
                      name="Target"
                      stroke="#64748b"
                      strokeDasharray="7 5"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="productionActual"
                      name="Actual"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Trend</CardTitle>
            <CardDescription>
              Monthly internal error/rejection target versus actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No error data is available for the selected filters.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        Number(value).toLocaleString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="errorTarget"
                      name="Target"
                      stroke="#f59e0b"
                      strokeDasharray="7 5"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="errorActual"
                      name="Actual"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Headcount by department for the selected location.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No departments are available for the selected filters.
            </div>
          ) : (
            departments.map((department) => {
              const count = filteredEmployees.filter(
                (employee) => employee.department === department
              ).length;

              return (
                <div
                  key={department}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span className="font-medium">{department}</span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {count} {count === 1 ? "person" : "people"}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
