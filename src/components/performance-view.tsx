import { useMemo, useState } from "react";
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
  monthToLabel,
  type MyDashboard,
  type SheetPerformance,
} from "@/lib/sheetsApi";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Field({
  label,
  value,
}: {
  label: string;
  value?: unknown;
}) {
  const displayValue =
    value == null ? "" : String(value).trim();

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-0.5 font-medium">
        {displayValue || "—"}
      </div>
    </div>
  );
}

export function PerformanceView({
  data,
  compact,
  onEditProfile,
}: {
  data: MyDashboard;
  compact?: boolean;
  onEditProfile?: () => void;
}) {
  const profile =
    data?.profile ??
    ({} as MyDashboard["profile"]);

  const currentMonth =
    data?.currentMonth ?? null;

  const previousMonths =
    data?.previousMonths ?? [];

  const [selectedYear, setSelectedYear] =
    useState("all");

  const allPerformance =
    useMemo(() => {
      const monthMap =
        new Map<string, SheetPerformance>();

      previousMonths.forEach(
        (item) => {
          if (item?.month) {
            monthMap.set(
              String(item.month),
              item
            );
          }
        }
      );

      if (currentMonth?.month) {
        monthMap.set(
          String(currentMonth.month),
          currentMonth
        );
      }

      return Array.from(
        monthMap.values()
      ).sort(
        (a, b) =>
          String(a.month).localeCompare(
            String(b.month)
          )
      );
    }, [
      currentMonth,
      previousMonths,
    ]);

  const availableYears =
    useMemo(() => {
      const years =
        allPerformance
          .map((item) =>
            String(
              item.month ?? ""
            ).slice(0, 4)
          )
          .filter((year) =>
            /^\d{4}$/.test(year)
          );

      return Array.from(
        new Set(years)
      ).sort(
        (a, b) =>
          Number(a) - Number(b)
      );
    }, [allPerformance]);

  const history =
    useMemo(() => {
      const filtered =
        selectedYear === "all"
          ? allPerformance
          : allPerformance.filter(
              (item) =>
                String(
                  item.month ?? ""
                ).slice(0, 4) ===
                selectedYear
            );

      return [...filtered].sort(
        (a, b) =>
          String(a.month).localeCompare(
            String(b.month)
          )
      );
    }, [
      allPerformance,
      selectedYear,
    ]);

  const currentMonthKey =
    currentMonth?.month
      ? String(currentMonth.month)
      : "";

  return (
    <div className="space-y-6">
      {/* PROFILE */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {compact
                ? "Profile"
                : "My Profile"}
            </CardTitle>

            <CardDescription>
              Details from the employee master.
            </CardDescription>
          </div>

          {onEditProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
            >
              <Pencil className="size-4 mr-1" />
              Edit profile
            </Button>
          )}
        </CardHeader>

        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Employee ID"
            value={profile.employeeId}
          />

          <Field
            label="Name"
            value={profile.name}
          />

          <Field
            label="Email"
            value={profile.email}
          />

          <Field
            label="Department"
            value={profile.department}
          />

          <Field
            label="Designation"
            value={profile.designation}
          />

          <Field
            label="Team Lead"
            value={profile.teamLead}
          />

          <Field
            label="Location"
            value={profile.location}
          />

          <Field
            label="Joining Date"
            value={
              profile.joiningDate
                ? String(
                    profile.joiningDate
                  ).slice(0, 10)
                : ""
            }
          />
        </CardContent>
      </Card>

      {/* PERSONAL PERFORMANCE */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                Personal Performance
              </CardTitle>

              <CardDescription>
                Monthly performance history.
              </CardDescription>
            </div>

            {availableYears.length > 0 && (
              <Select
                value={selectedYear}
                onValueChange={
                  setSelectedYear
                }
              >
                <SelectTrigger className="w-[140px]">
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
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No performance data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Month
                    </TableHead>

                    <TableHead>
                      Production
                    </TableHead>

                    <TableHead>
                      Tickets
                    </TableHead>

                    <TableHead>
                      Errors
                    </TableHead>

                    <TableHead>
                      Attendance
                    </TableHead>

                    <TableHead>
                      Behavior
                    </TableHead>

                    <TableHead>
                      Performance Rating
                    </TableHead>

                    <TableHead>
                      Manager Remarks
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {history.map(
                    (p) => {
                      const isCurrent =
                        String(
                          p.month
                        ) ===
                        currentMonthKey;

                      return (
                        <TableRow
                          key={p.month}
                          className={
                            isCurrent
                              ? "bg-muted/40"
                              : undefined
                          }
                        >
                          <TableCell className="whitespace-nowrap font-medium">
                            <div className="flex items-center gap-2">
                              {monthToLabel(
                                p.month
                              )}

                              {isCurrent && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  Current
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {p.productionActual ?? 0}
                            {" / "}
                            {p.productionTarget ?? 0}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {p.ticketActual ?? 0}
                            {" / "}
                            {p.ticketTarget ?? 0}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {p.errorActual ?? 0}
                            {" / "}
                            {p.errorTarget ?? 0}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {Number(
                              p.attendance ?? 0
                            ).toFixed(1)}
                            /10
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {Number(
                              p.behavior ?? 0
                            ).toFixed(1)}
                            /5
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <RatingBadge rating={p.performanceRating} score={p.ratingScore} />
                          </TableCell>

                          <TableCell className="min-w-[220px] max-w-[320px]">
                            {p.managerRemarks || "—"}
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
    </div>
  );
}

export function RatingBadge({
  rating,
  score,
}: {
  rating?: string | null;
  score?: number | null;
}) {
  if (!rating && (score === undefined || score === null)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const r = String(rating || "").trim();
  const lower = r.toLowerCase();

  let colorClasses = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200";

  if (lower.includes("outstanding") || (score !== undefined && score !== null && score >= 4.5)) {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
  } else if (lower.includes("exceeds") || (score !== undefined && score !== null && score >= 4.0)) {
    colorClasses = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
  } else if (lower.includes("meets") || (score !== undefined && score !== null && score >= 3.0)) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
  } else if (lower.includes("needs") || (score !== undefined && score !== null && score >= 2.0)) {
    colorClasses = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
  } else if (lower.includes("unsatisfactory") || (score !== undefined && score !== null && score > 0 && score < 2.0)) {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${colorClasses}`}
    >
      {score !== undefined && score !== null && score > 0 && (
        <span className="font-mono text-[11px] font-bold">
          {Number(score).toFixed(2)}
        </span>
      )}
      <span>{r || (score ? "" : "—")}</span>
    </span>
  );
}
