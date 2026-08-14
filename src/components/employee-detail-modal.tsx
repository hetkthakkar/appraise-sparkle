import { useEffect, useMemo, useState } from "react";
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

import { toast } from "sonner";

import { useAuth } from "@/lib/mock-auth";

import {
  adminUpdateEmployee,
  getEmployeeDetail,
  listDepartments,
  listDesignations,
  listLocations,
  listTeamLeads,
} from "@/lib/sheetsApi";

interface Props {
  employeeId: string | null;
  onOpenChange: (open: boolean) => void;
}

interface PerformanceItem {
  month?: string;
  employeeId?: string;
  name?: string;
  location?: string;

  productionTarget?: number | string;
  productionActual?: number | string;

  ticketTarget?: number | string;
  ticketActual?: number | string;

  errorTarget?: number | string;
  errorActual?: number | string;

  attendance?: number | string;
  behavior?: number | string;

  managerRemarks?: string;
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

interface EmployeeDetailData {
  profile: EmployeeProfile;
  currentMonth?: PerformanceItem | null;
  previousMonths?: PerformanceItem[];
}

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState("all");

  const detailQ = useQuery<EmployeeDetailData>({
    queryKey: ["employeeDetail", employeeId],
    queryFn: () =>
      getEmployeeDetail(
        user!.email,
        employeeId!
      ),
    enabled:
      !!user &&
      !!employeeId,
  });

  useEffect(() => {
    setEditing(false);
    setSelectedYear("all");
  }, [employeeId]);

  const availableYears = useMemo(() => {
    const months =
      detailQ.data?.previousMonths ?? [];

    const years = months
      .map((item) =>
        String(item.month ?? "").slice(0, 4)
      )
      .filter((year) =>
        /^\d{4}$/.test(year)
      );

    return Array.from(new Set(years)).sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [detailQ.data]);

  const previousMonths = useMemo(() => {
    const months =
      detailQ.data?.previousMonths ?? [];

    if (selectedYear === "all") {
      return months;
    }

    return months.filter(
      (item) =>
        String(item.month ?? "").slice(0, 4) ===
        selectedYear
    );
  }, [
    detailQ.data,
    selectedYear,
  ]);

  const profile =
    detailQ.data?.profile;

  const currentMonth =
    detailQ.data?.currentMonth;

  return (
    <Dialog
      open={!!employeeId}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        {/* ================================
            HEADER
        ================================= */}
        <div className="border-b bg-background px-6 py-5">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {profile?.name ||
                    "Employee Detail"}
                </DialogTitle>

                <DialogDescription className="mt-1">
                  Employee information, team
                  details and performance history.
                </DialogDescription>
              </div>

              {profile?.designation && (
                <div className="shrink-0 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {profile.designation}
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* ================================
            CONTENT
        ================================= */}
        <div className="space-y-6 px-6 py-6">
          {detailQ.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-52 w-full rounded-xl" />
            </div>
          ) : detailQ.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <p className="text-sm font-medium text-destructive">
                Failed to load employee details.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {detailQ.error instanceof Error
                  ? detailQ.error.message
                  : String(detailQ.error)}
              </p>
            </div>
          ) : profile ? (
            <>
              {/* ================================
                  1. EMPLOYEE DETAILS
              ================================= */}
              <section className="space-y-3">
                <SectionHeading
                  title="Employee Details"
                  description="Basic information from the employee master."
                />

                <div className="rounded-xl border bg-card">
                  <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                    <InfoItem
                      label="Employee ID"
                      value={profile.employeeId}
                    />

                    <InfoItem
                      label="Name"
                      value={profile.name}
                    />

                    <InfoItem
                      label="Email"
                      value={profile.email}
                    />

                    <InfoItem
                      label="Joining Date"
                      value={formatDate(profile.joiningDate)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditing((v) => !v)
                    }
                  >
                    {editing
                      ? "Close editor"
                      : "Edit details"}
                  </Button>
                </div>

                {editing && (
                  <EditForm
                    employeeId={employeeId!}
                    initial={profile}
                    onDone={() => {
                      setEditing(false);
                    }}
                  />
                )}
              </section>

              {/* ================================
                  2. TEAM & REPORTING
              ================================= */}
              <section className="space-y-3">
                <SectionHeading
                  title="Team & Reporting"
                  description="Where this employee sits in the organisation."
                />

                <div className="rounded-xl border bg-card p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCard
                      label="Team Lead"
                      value={
                        profile.teamLead ||
                        "Not assigned"
                      }
                      highlight
                    />

                    <InfoCard
                      label="Department"
                      value={
                        profile.department ||
                        "Not assigned"
                      }
                    />

                    <InfoCard
                      label="Designation"
                      value={
                        profile.designation ||
                        "Not assigned"
                      }
                    />

                    <InfoCard
                      label="Location"
                      value={
                        profile.location ||
                        "Not assigned"
                      }
                    />
                  </div>

                  {/* Clear reporting relationship */}
                  <div className="mt-5 rounded-lg border bg-muted/30 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reporting To
                    </div>

                    <div className="mt-1 text-base font-semibold">
                      {profile.teamLead ||
                        "No team lead assigned"}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      This employee reports to the
                      team lead shown above.
                    </div>
                  </div>
                </div>
              </section>

              {/* ================================
                  3. CURRENT MONTH
              ================================= */}
              <section className="space-y-3">
                <SectionHeading
                  title="Current Month"
                  description="Live performance snapshot for the current month."
                />

                {currentMonth ? (
                  <PerformanceMonthCard
                    item={currentMonth}
                    current
                  />
                ) : (
                  <EmptyState
                    title="No current-month performance"
                    description="No performance data has been uploaded for the current month yet."
                  />
                )}
              </section>

              {/* ================================
                  4. PREVIOUS MONTHS
              ================================= */}
              <section className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <SectionHeading
                    title="Previous Months"
                    description="Historical performance records for this employee."
                  />

                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Year
                      </span>

                      <Select
                        value={selectedYear}
                        onValueChange={
                          setSelectedYear
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select year" />
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
                    </div>
                  )}
                </div>

                {previousMonths.length > 0 ? (
                  <PreviousMonthsTable
                    months={previousMonths}
                  />
                ) : (
                  <EmptyState
                    title="No previous performance history"
                    description="There are no previous monthly performance records for this employee."
                  />
                )}
              </section>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-0.5 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   SIMPLE INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-1.5 truncate text-sm font-medium">
        {value || "—"}
      </div>
    </div>
  );
}

/* =========================================================
   TEAM INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border p-4",
        highlight
          ? "bg-primary/[0.04] border-primary/20"
          : "bg-background",
      ].join(" ")}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div
        className={[
          "mt-1.5 text-sm font-semibold",
          highlight
            ? "text-primary"
            : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   CURRENT MONTH PERFORMANCE CARD
========================================================= */

function PerformanceMonthCard({
  item,
  current = false,
}: {
  item: PerformanceItem;
  current?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold">
            {formatMonth(item.month)}
          </h4>

          <p className="text-xs text-muted-foreground">
            {current
              ? "Current performance snapshot"
              : "Monthly performance"}
          </p>
        </div>

        {current && (
          <span className="w-fit rounded-full border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
            Current
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Production"
          actual={item.productionActual}
          target={item.productionTarget}
        />

        <MetricCard
          label="Tickets"
          actual={item.ticketActual}
          target={item.ticketTarget}
        />

        <MetricCard
          label="Errors / Rejection"
          actual={item.errorActual}
          target={item.errorTarget}
          reverse
        />

        <ScoreCard
          label="Attendance"
          value={item.attendance}
          max="10"
        />

        <ScoreCard
          label="Behavior"
          value={item.behavior}
          max="5"
        />
      </div>

      {item.managerRemarks && (
        <div className="mt-5 rounded-lg border bg-muted/30 p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Manager Remarks
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {item.managerRemarks}
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  actual,
  target,
  reverse = false,
}: {
  label: string;
  actual?: number | string;
  target?: number | string;
  reverse?: boolean;
}) {
  const actualValue = toNumber(actual);
  const targetValue = toNumber(target);

  let percentage: number | null = null;

  if (
    targetValue !== null &&
    targetValue !== 0 &&
    actualValue !== null
  ) {
    percentage =
      (actualValue / targetValue) * 100;
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-semibold">
          {displayValue(actual)}
        </span>

        <span className="text-xs text-muted-foreground">
          / {displayValue(target)}
        </span>
      </div>

      {percentage !== null && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          {reverse
            ? "Lower is better"
            : `${Math.round(percentage)}% of target`}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  label,
  value,
  max,
}: {
  label: string;
  value?: number | string;
  max: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-lg font-semibold">
          {displayValue(value)}
        </span>

        <span className="text-xs text-muted-foreground">
          / {max}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   PREVIOUS MONTH TABLE
========================================================= */

function PreviousMonthsTable({
  months,
}: {
  months: PerformanceItem[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Month
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Production
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Tickets
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Errors
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Attendance
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Behavior
              </th>
            </tr>
          </thead>

          <tbody>
            {months.map((item, index) => (
              <tr
                key={`${item.month}-${index}`}
                className="border-b last:border-b-0"
              >
                <td className="px-4 py-3 font-medium">
                  {formatMonth(item.month)}
                </td>

                <td className="px-4 py-3">
                  <MetricText
                    actual={item.productionActual}
                    target={item.productionTarget}
                  />
                </td>

                <td className="px-4 py-3">
                  <MetricText
                    actual={item.ticketActual}
                    target={item.ticketTarget}
                  />
                </td>

                <td className="px-4 py-3">
                  <MetricText
                    actual={item.errorActual}
                    target={item.errorTarget}
                  />
                </td>

                <td className="px-4 py-3">
                  {displayValue(item.attendance)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    / 10
                  </span>
                </td>

                <td className="px-4 py-3">
                  {displayValue(item.behavior)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    / 5
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE METRIC
========================================================= */

function MetricText({
  actual,
  target,
}: {
  actual?: number | string;
  target?: number | string;
}) {
  return (
    <span>
      <span className="font-medium">
        {displayValue(actual)}
      </span>

      <span className="text-xs text-muted-foreground">
        {" "}
        / {displayValue(target)}
      </span>
    </span>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center">
      <p className="text-sm font-medium">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   EDIT FORM
========================================================= */

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

  const deptQ = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
  });

  const desigQ = useQuery({
    queryKey: ["designations"],
    queryFn: listDesignations,
  });

  const locQ = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
  });

  const leadQ = useQuery({
    queryKey: ["teamLeads"],
    queryFn: listTeamLeads,
  });

  const [updatedEmployeeId, setUpdatedEmployeeId] =
    useState(
      initial.employeeId ??
        employeeId
    );

  const [email, setEmail] =
    useState(initial.email ?? "");

  const [department, setDepartment] =
    useState(
      initial.department ?? ""
    );

  const [designation, setDesignation] =
    useState(
      initial.designation ?? ""
    );

  const [teamLead, setTeamLead] =
    useState(
      initial.teamLead ?? ""
    );

  const [location, setLocation] =
    useState(
      initial.location ?? ""
    );

  const [joiningDate, setJoiningDate] =
    useState(
      initial.joiningDate
        ? String(
            initial.joiningDate
          ).slice(0, 10)
        : ""
    );

  const mutation = useMutation({
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

    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({
          queryKey: [
            "employeeDetail",
            employeeId,
          ],
        }),

        qc.refetchQueries({
          queryKey: ["employees"],
        }),

        qc.refetchQueries({
          queryKey: ["performance"],
        }),

        qc.refetchQueries({
          queryKey: ["myDashboard"],
        }),
      ]);

      toast.success(
        "Employee updated"
      );

      onDone();
    },

    onError: (e) => {
      toast.error(
        "Update failed",
        {
          description:
            e instanceof Error
              ? e.message
              : String(e),
        }
      );
    },
  });

  return (
    <form
      className="rounded-xl border bg-muted/20 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="mb-5">
        <h4 className="text-sm font-semibold">
          Edit Employee Details
        </h4>

        <p className="mt-1 text-xs text-muted-foreground">
          Update the employee master information.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {user?.role === "super_admin" && (
          <>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="edit-employee-id"
              >
                Employee ID
              </label>

              <Input
                id="edit-employee-id"
                value={
                  updatedEmployeeId
                }
                onChange={(e) =>
                  setUpdatedEmployeeId(
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="edit-email"
              >
                Email
              </label>

              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                required
              />
            </div>
          </>
        )}

        <Picker
          label="Department"
          value={department}
          onChange={setDepartment}
          options={
            deptQ.data ?? []
          }
        />

        <Picker
          label="Designation"
          value={designation}
          onChange={setDesignation}
          options={
            desigQ.data ?? []
          }
        />

        <Picker
          label="Team Lead"
          value={teamLead}
          onChange={setTeamLead}
          options={
            leadQ.data ?? []
          }
        />

        <Picker
          label="Location"
          value={location}
          onChange={setLocation}
          options={
            locQ.data ?? []
          }
        />

        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            htmlFor="edit-joining"
          >
            Joining Date
          </label>

          <Input
            id="edit-joining"
            type="date"
            value={joiningDate}
            onChange={(e) =>
              setJoiningDate(
                e.target.value
              )
            }
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
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
  );
}

/* =========================================================
   PICKER
========================================================= */

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
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
      </label>

      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={`Select ${label.toLowerCase()}`}
          />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option}
              value={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function displayValue(
  value?: number | string | null
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
}

function toNumber(
  value?: number | string | null
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const s = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] =
      s.split("-");

    return `${day}/${month}/${year}`;
  }

  return s;
}

function formatMonth(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})$/
  );

  if (!match) {
    return String(value);
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    1
  );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
}
