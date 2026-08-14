import { useEffect, useState } from "react";
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

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  IdCard,
  Mail,
  MapPin,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { PerformanceView } from "@/components/performance-view";
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
   MAIN MODAL
   ============================================================ */

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);

  const detailQ = useQuery({
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

  /*
   * Close edit mode whenever:
   * - another employee is opened
   * - modal is closed
   */
  useEffect(() => {
    setEditing(false);
  }, [employeeId]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false);
    }

    onOpenChange(open);
  }

  const profile =
    detailQ.data?.profile;

  const initials =
    profile?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "E";

  return (
    <Dialog
      open={!!employeeId}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className="
          max-h-[92vh]
          w-[calc(100%-1rem)]
          max-w-5xl
          overflow-hidden
          p-0
        "
      >
        {/* ==================================================
            HEADER
            ================================================== */}

        <div className="border-b bg-background">
          <DialogHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start gap-4 pr-8">
              {/* Avatar */}
              <div
                className="
                  flex
                  size-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary/10
                  text-lg
                  font-semibold
                  text-primary
                  ring-1
                  ring-primary/10
                "
              >
                {initials}
              </div>

              {/* Name / role */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {profile?.name ??
                      "Employee detail"}
                  </DialogTitle>

                  {profile?.designation && (
                    <Badge
                      variant="secondary"
                      className="font-normal"
                    >
                      {profile.designation}
                    </Badge>
                  )}
                </div>

                <DialogDescription className="mt-1">
                  Employee profile, current performance
                  and performance history.
                </DialogDescription>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {profile?.employeeId && (
                    <span className="inline-flex items-center gap-1.5">
                      <IdCard className="size-3.5" />
                      {profile.employeeId}
                    </span>
                  )}

                  {profile?.email && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail className="size-3.5" />
                      <span className="truncate">
                        {profile.email}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* ==================================================
              ACTION BAR
              ================================================== */}

          {detailQ.data && (
            <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Employee record loaded</span>
              </div>

              <Button
                variant={
                  editing
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                onClick={() =>
                  setEditing(
                    (value) => !value
                  )
                }
              >
                {editing ? (
                  <>
                    <X className="size-4" />
                    Close editor
                  </>
                ) : (
                  <>
                    <Edit3 className="size-4" />
                    Edit details
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ==================================================
            SCROLLABLE BODY
            ================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6">
            {/* Loading */}
            {detailQ.isLoading && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>

                <Skeleton className="h-48 w-full rounded-xl" />

                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            )}

            {/* Error */}
            {detailQ.isError && (
              <div
                className="
                  rounded-xl
                  border
                  border-destructive/20
                  bg-destructive/5
                  p-5
                "
              >
                <div className="font-medium text-destructive">
                  Unable to load employee
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {detailQ.error instanceof Error
                    ? detailQ.error.message
                    : String(detailQ.error)}
                </p>

                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    detailQ.refetch()
                  }
                >
                  Try again
                </Button>
              </div>
            )}

            {/* =================================================
                LOADED CONTENT
                ================================================= */}

            {detailQ.data && profile && (
              <div className="space-y-6">
                {/* =================================================
                    PROFILE SUMMARY
                    ================================================= */}

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Employee information
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        Details from the employee master.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCard
                      icon={IdCard}
                      label="Employee ID"
                      value={
                        profile.employeeId
                      }
                    />

                    <InfoCard
                      icon={Mail}
                      label="Email"
                      value={
                        profile.email
                      }
                    />

                    <InfoCard
                      icon={Building2}
                      label="Department"
                      value={
                        profile.department
                      }
                    />

                    <InfoCard
                      icon={UserRound}
                      label="Designation"
                      value={
                        profile.designation
                      }
                    />

                    <InfoCard
                      icon={Users}
                      label="Team Lead"
                      value={
                        profile.teamLead
                      }
                    />

                    <InfoCard
                      icon={MapPin}
                      label="Location"
                      value={
                        profile.location
                      }
                    />

                    <InfoCard
                      icon={CalendarDays}
                      label="Joining Date"
                      value={
                        profile.joiningDate
                          ? String(
                              profile.joiningDate
                            ).slice(
                              0,
                              10
                            )
                          : ""
                      }
                    />

                    <InfoCard
                      icon={CheckCircle2}
                      label="Status"
                      value="Active"
                      valueClassName="text-emerald-600"
                    />
                  </div>
                </section>

                {/* =================================================
                    EDIT FORM
                    ================================================= */}

                {editing && (
                  <>
                    <Separator />

                    <section>
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold">
                          Edit employee details
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          Update the employee master information.
                        </p>
                      </div>

                      <EditForm
                        employeeId={
                          employeeId!
                        }
                        initial={
                          profile
                        }
                        onDone={() => {
                          setEditing(false);

                          /*
                           * Refresh the detail query after
                           * the save is completed.
                           */
                          detailQ.refetch();
                        }}
                      />
                    </section>
                  </>
                )}

                {/* =================================================
                    PERFORMANCE
                    ================================================= */}

                <Separator />

                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold">
                      Performance
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Current month KPIs and historical performance.
                    </p>
                  </div>

                  <PerformanceView
                    data={detailQ.data}
                    compact
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ============================================================
   INFO CARD
   ============================================================ */

function InfoCard({
  icon: Icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value?: unknown;
  valueClassName?: string;
}) {
  const displayValue =
    value == null ||
    String(value).trim() === ""
      ? "—"
      : String(value).trim();

  return (
    <div
      className="
        min-w-0
        rounded-xl
        border
        bg-card
        p-4
        transition-colors
        hover:bg-muted/30
      "
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </div>

      <div
        className={`
          mt-2
          truncate
          text-sm
          font-medium
          ${valueClassName}
        `}
        title={displayValue}
      >
        {displayValue}
      </div>
    </div>
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

  /* ----------------------------------------------------------
     LOOKUPS
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     FORM STATE
     ---------------------------------------------------------- */

  const [
    updatedEmployeeId,
    setUpdatedEmployeeId,
  ] = useState(
    initial.employeeId ??
      employeeId
  );

  const [email, setEmail] =
    useState(
      initial.email ?? ""
    );

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

  /* ----------------------------------------------------------
     UPDATE EMPLOYEE
     ---------------------------------------------------------- */

  const m = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error(
          "User session not found."
        );
      }

      return adminUpdateEmployee(
        user.email,
        employeeId,
        {
          /*
           * Super Admin can edit Employee ID
           * and Email.
           */
          ...(user.role ===
          "super_admin"
            ? {
                employeeId:
                  updatedEmployeeId.trim(),

                email:
                  email.trim(),
              }
            : {}),

          department:
            department.trim(),

          designation:
            designation.trim(),

          teamLead:
            teamLead.trim(),

          location:
            location.trim(),

          joiningDate:
            joiningDate || "",
        }
      );
    },

    onSuccess: async () => {
      /*
       * Refresh everything that can be affected
       * by employee master changes.
       */
      await Promise.all([
        qc.invalidateQueries({
          queryKey: [
            "employeeDetail",
            employeeId,
          ],
        }),

        qc.invalidateQueries({
          queryKey: ["employees"],
        }),

        qc.invalidateQueries({
          queryKey: ["performance"],
        }),

        qc.invalidateQueries({
          queryKey: ["myDashboard"],
        }),

        qc.invalidateQueries({
          queryKey: ["teamLeads"],
        }),
      ]);

      toast.success(
        "Employee updated successfully"
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

  /* ----------------------------------------------------------
     SUBMIT
     ---------------------------------------------------------- */

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!user) {
      toast.error(
        "User session not found"
      );
      return;
    }

    if (
      user.role ===
        "super_admin" &&
      !updatedEmployeeId.trim()
    ) {
      toast.error(
        "Employee ID is required"
      );
      return;
    }

    if (
      user.role ===
        "super_admin" &&
      !email.trim()
    ) {
      toast.error(
        "Email is required"
      );
      return;
    }

    m.mutate();
  }

  /* ----------------------------------------------------------
     RENDER
     ---------------------------------------------------------- */

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
    >
      <div
        className="
          grid
          gap-4
          rounded-xl
          border
          bg-muted/20
          p-4
          sm:grid-cols-2
        "
      >
        {/* ==================================================
            SUPER ADMIN ONLY
            ================================================== */}

        {user?.role ===
          "super_admin" && (
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

              <p className="text-xs text-muted-foreground">
                Super Admin only.
              </p>
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

              <p className="text-xs text-muted-foreground">
                Super Admin only.
              </p>
            </div>
          </>
        )}

        {/* ==================================================
            DEPARTMENT
            ================================================== */}

        <Picker
          label="Department"
          value={department}
          onChange={
            setDepartment
          }
          options={
            deptQ.data ?? []
          }
        />

        {/* ==================================================
            DESIGNATION
            ================================================== */}

        <Picker
          label="Designation"
          value={designation}
          onChange={
            setDesignation
          }
          options={
            desigQ.data ?? []
          }
        />

        {/* ==================================================
            TEAM LEAD
            ================================================== */}

        <Picker
          label="Team Lead"
          value={teamLead}
          onChange={
            setTeamLead
          }
          options={
            leadQ.data ?? []
          }
        />

        {/* ==================================================
            LOCATION
            ================================================== */}

        <Picker
          label="Location"
          value={location}
          onChange={
            setLocation
          }
          options={
            locQ.data ?? []
          }
        />

        {/* ==================================================
            JOINING DATE
            ================================================== */}

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

      {/* ==================================================
          FORM ACTIONS
          ================================================== */}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={
            m.isPending
          }
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={
            m.isPending
          }
        >
          {m.isPending
            ? "Saving…"
            : "Save changes"}
        </Button>
      </div>
    </form>
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
  /*
   * Remove duplicates and empty values.
   */
  const uniqueOptions =
    Array.from(
      new Set(
        (options ?? [])
          .map((option) =>
            String(option).trim()
          )
          .filter(Boolean)
      )
    );

  /*
   * If the employee currently has a value that is
   * no longer present in the lookup, keep it visible
   * so the Select does not lose the existing value.
   */
  if (
    value.trim() &&
    !uniqueOptions.includes(
      value.trim()
    )
  ) {
    uniqueOptions.unshift(
      value.trim()
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
      </label>

      <Select
        value={value || undefined}
        onValueChange={
          onChange
        }
      >
        <SelectTrigger>
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
