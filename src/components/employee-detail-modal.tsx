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

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState("all");

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

  // Reset editor and year filter whenever another employee is opened.
  useEffect(() => {
    setEditing(false);
    setSelectedYear("all");
  }, [employeeId]);

  // Get all years available in this employee's history.
  const availableYears = useMemo(() => {
    const months =
      detailQ.data?.previousMonths ?? [];

    const years = months
      .map((item) =>
        String(item.month ?? "")
          .slice(0, 4)
      )
      .filter((year) =>
        /^\d{4}$/.test(year)
      );

    return Array.from(
      new Set(years)
    ).sort(
      (a, b) =>
        Number(b) - Number(a)
    );
  }, [detailQ.data]);

  // Filter only Previous Months.
  // Current Month remains unchanged.
  const filteredData = useMemo(() => {
    if (!detailQ.data) {
      return null;
    }

    const previousMonths =
      detailQ.data.previousMonths ?? [];

    if (selectedYear === "all") {
      return detailQ.data;
    }

    return {
      ...detailQ.data,
      previousMonths:
        previousMonths.filter(
          (item) =>
            String(item.month ?? "")
              .slice(0, 4) ===
            selectedYear
        ),
    };
  }, [
    detailQ.data,
    selectedYear,
  ]);

  return (
    <Dialog
      open={!!employeeId}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {detailQ.data?.profile?.name ??
              "Employee detail"}
          </DialogTitle>

          <DialogDescription>
            Profile and performance history.
          </DialogDescription>
        </DialogHeader>

        {detailQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detailQ.isError ? (
          <p className="text-sm text-destructive">
            Failed to load:{" "}
            {detailQ.error instanceof Error
              ? detailQ.error.message
              : String(detailQ.error)}
          </p>
        ) : detailQ.data ? (
          <div className="space-y-4">
            {/* Edit button */}
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

            {/* Edit form */}
            {editing && (
              <EditForm
                employeeId={employeeId!}
                initial={
                  detailQ.data.profile ?? {}
                }
                onDone={() => {
                  setEditing(false);
                }}
              />
            )}

            {/* Year filter */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  Performance History
                </p>

                <p className="text-xs text-muted-foreground">
                  Filter previous months by year.
                </p>
              </div>

              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger className="w-[150px]">
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

            {/* Performance */}
            {filteredData && (
              <PerformanceView
                data={filteredData}
                compact
              />
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  employeeId,
  initial,
  onDone,
}: {
  employeeId: string;
  initial: {
    employeeId?: string;
    email?: string;
    department?: string;
    designation?: string;
    teamLead?: string;
    location?: string;
    joiningDate?: string;
  };
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

  const m = useMutation({
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
            "myDashboard",
          ],
        }),
      ]);

      toast.success(
        "Employee updated"
      );

      onDone();
    },

    onError: (e) =>
      toast.error(
        "Update failed",
        {
          description:
            e instanceof Error
              ? e.message
              : String(e),
        }
      ),
  });

  return (
    <form
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
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
        onChange={
          setDepartment
        }
        options={
          deptQ.data ?? []
        }
      />

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

      <div className="flex items-end justify-end sm:col-span-2">
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
          {options.map(
            (o) => (
              <SelectItem
                key={o}
                value={o}
              >
                {o}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
