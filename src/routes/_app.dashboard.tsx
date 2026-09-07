import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarRange,
  Filter,
  RefreshCcw,
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

  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
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

  const loading = empQ.isLoading || perfQ.isLoading;
  const me = meQ.data?.profile;

  const needsOnboarding =
    !me ||
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.location?.trim() ||
    !String(me.joiningDate ?? "").trim();

  const resetFilters = () => {
    setFromMonth("");
    setToMonth("");
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
          Welcome back, {user.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here's what's happening across the organisation.
        </p>
      </div>

      {/* Universal dashboard filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Dashboard Filters
            </CardTitle>
            <CardDescription>
              These filters update the dashboard data, department summary, and both monthly graphs.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Month</label>
              <Select
                value={fromMonth || undefined}
                onValueChange={(value) => {
                  setFromMonth(value);
                  if (toMonth && value > toMonth) setToMonth("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {monthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Month</label>
              <Select
                value={toMonth || undefined}
                onValueChange={(value) => {
                  setToMonth(value);
                  if (fromMonth && value < fromMonth) setFromMonth("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths
                    .filter((month) => !fromMonth || month >= fromMonth)
                    .map((month) => (
                      <SelectItem key={month} value={month}>
                        {monthLabel(month)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
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

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full xl:w-auto"
                onClick={resetFilters}
                disabled={
                  !fromMonth &&
                  !toMonth &&
                  selectedLocation === ALL_LOCATIONS
                }
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
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
              label="Performance Rows"
              value={filteredPerformance.length}
              icon={CalendarRange}
              hint={
                fromMonth || toMonth
                  ? `${fromMonth ? monthLabel(fromMonth) : "Start"} – ${
                      toMonth ? monthLabel(toMonth) : "Latest"
                    }`
                  : "All available months"
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
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="productionActual"
                      name="Actual"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
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
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="errorActual"
                      name="Actual"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
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
