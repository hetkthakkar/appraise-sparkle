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

  /*
   * ----------------------------------------------------------
   * COMBINE CURRENT + PREVIOUS MONTHS
   * ----------------------------------------------------------
   *
   * All personal performance is shown in ONE table.
   *
   * We merge currentMonth and previousMonths and
   * de-duplicate by month.
   */
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

  /*
   * ----------------------------------------------------------
   * AVAILABLE YEARS
   * ----------------------------------------------------------
   */
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

  /*
   * ----------------------------------------------------------
   * FILTER + SORT
   * ----------------------------------------------------------
   *
   * Jan -> Dec
   *
   * When "All Years" is selected:
   *
   * 2025 Jan
   * 2025 Feb
   * ...
   * 2025 Dec
   * 2026 Jan
   * 2026 Feb
   * ...
   */
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

  /*
   * ----------------------------------------------------------
   * CURRENT MONTH
   * ----------------------------------------------------------
   *
   * Current month is highlighted inside the same table.
   */
  const currentMonthKey =
    currentMonth?.month
      ? String(currentMonth.month)
      : "";

  return (
    <div className="space-y-6">

      {/* ======================================================
          PROFILE
          ====================================================== */}
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
              <Pencil className="size-4" />
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


      {/* ======================================================
          PERSONAL PERFORMANCE - SINGLE TABLE
          ====================================================== */}
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


            {/* YEAR FILTER */}
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
                      Errors / Rejections
                    </TableHead>

                    <TableHead>
                      Attendance
                    </TableHead>

                    <TableHead>
                      Behavior
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

                          {/* MONTH */}
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


                          {/* PRODUCTION */}
                          <TableCell className="whitespace-nowrap">
                            {p.productionActual ??
                              0}
                            {" / "}
                            {p.productionTarget ??
                              0}
                          </TableCell>


                          {/* TICKETS */}
                          <TableCell className="whitespace-nowrap">
                            {p.ticketActual ??
                              0}
                            {" / "}
                            {p.ticketTarget ??
                              0}
                          </TableCell>


                          {/* ERRORS */}
                          <TableCell className="whitespace-nowrap">
                            {p.errorActual ??
                              0}
                            {" / "}
                            {p.errorTarget ??
                              0}
                          </TableCell>


                          {/* ATTENDANCE */}
                          <TableCell className="whitespace-nowrap">
                            {Number(
                              p.attendance ??
                                0
                            ).toFixed(1)}
                            /10
                          </TableCell>


                          {/* BEHAVIOR */}
                          <TableCell className="whitespace-nowrap">
                            {Number(
                              p.behavior ??
                                0
                            ).toFixed(1)}
                            /5
                          </TableCell>


                          {/* REMARKS */}
                          <TableCell className="min-w-[220px] max-w-[320px]">
                            {p.managerRemarks ||
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

    </div>
  );
}
