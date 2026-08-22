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

export function EmployeeDetailModal({
  employeeId,
  onOpenChange,
}: Props) {
  const { user } = useAuth();

  const [editing, setEditing] =
    useState(false);

  const detailQ = useQuery({
    queryKey: [
      "employeeDetail",
      employeeId,
    ],

    queryFn: () =>
      getEmployeeDetail(
        user!.email,
        employeeId!
      ),

    enabled:
      !!user &&
      !!employeeId,
  });

  // Reset editor whenever another employee is opened.
  useEffect(() => {
    setEditing(false);
  }, [employeeId]);

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

        {/* ------------------------------------------------------
            LOADING
            ------------------------------------------------------ */}
        {detailQ.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* ------------------------------------------------------
            ERROR
            ------------------------------------------------------ */}
        {detailQ.isError && (
          <p className="text-sm text-destructive">
            Failed to load:{" "}
            {detailQ.error instanceof Error
              ? detailQ.error.message
              : String(detailQ.error)}
          </p>
        )}

        {/* ------------------------------------------------------
            CONTENT
            ------------------------------------------------------ */}
        {detailQ.data && (
          <div className="space-y-4">

            {/* Edit button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditing(
                    (value) => !value
                  )
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
                employeeId={
                  employeeId!
                }
                initial={
                  detailQ.data
                    .profile ?? {}
                }
                onDone={() => {
                  setEditing(false);
                }}
              />
            )}

            {/* ==================================================
                PERFORMANCE

                IMPORTANT:
                Keep ONLY the existing PerformanceView.

                The extra/new "Overall Team Performance"
                section is intentionally NOT rendered here.
                ================================================== */}

            <PerformanceView
              data={detailQ.data}
              compact
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
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
    queryKey: [
      "departments",
    ],
    queryFn:
      listDepartments,
  });

  const desigQ = useQuery({
    queryKey: [
      "designations",
    ],
    queryFn:
      listDesignations,
  });

  const locQ = useQuery({
    queryKey: [
      "locations",
    ],
    queryFn:
      listLocations,
  });

  const leadQ = useQuery({
    queryKey: [
      "teamLeads",
    ],
    queryFn:
      listTeamLeads,
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


  /* ----------------------------------------------------------
     UPDATE EMPLOYEE
     ---------------------------------------------------------- */

  const m = useMutation({

    mutationFn: () =>
      adminUpdateEmployee(
        user!.email,
        employeeId,
        {
          /*
           * Super Admin can edit
           * Employee ID and Email.
           *
           * Admin cannot edit
           * these fields.
           */
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

      /*
       * Refresh affected data
       * after saving.
       */
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

    m.mutate();
  }


  /* ----------------------------------------------------------
     RENDER
     ---------------------------------------------------------- */

  return (
    <form
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
      onSubmit={handleSubmit}
    >

      {/* ------------------------------------------------------
          SUPER ADMIN ONLY
          ------------------------------------------------------ */}

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


      {/* ------------------------------------------------------
          DEPARTMENT
          ------------------------------------------------------ */}

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


      {/* ------------------------------------------------------
          DESIGNATION
          ------------------------------------------------------ */}

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


      {/* ------------------------------------------------------
          TEAM LEAD
          ------------------------------------------------------ */}

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


      {/* ------------------------------------------------------
          LOCATION
          ------------------------------------------------------ */}

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


      {/* ------------------------------------------------------
          JOINING DATE
          ------------------------------------------------------ */}

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
          value={
            joiningDate
          }
          onChange={(e) =>
            setJoiningDate(
              e.target.value
            )
          }
        />
      </div>


      {/* ------------------------------------------------------
          SAVE
          ------------------------------------------------------ */}

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
   * Remove duplicate
   * dropdown values.
   */
  const uniqueOptions =
    Array.from(
      new Set(
        (options ?? [])
          .map((option) =>
            String(
              option
            ).trim()
          )
          .filter(Boolean)
      )
    );

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
