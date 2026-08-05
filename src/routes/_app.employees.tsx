import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/lib/mock-auth";
import {
  listEmployees,
  listDepartments,
  listDesignations,
  listTeamLeads,
  listLocations,
} from "@/lib/sheetsApi";

import { EmployeeDetailModal } from "@/components/employee-detail-modal";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [teamLeadFilter, setTeamLeadFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled:
      !!user &&
      (user.role === "super_admin" || user.role === "admin"),
  });

  // Use the same lists used by the employee onboarding form.
  const departmentsQ = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
    enabled:
      !!user &&
      (user.role === "super_admin" || user.role === "admin"),
  });

  const designationsQ = useQuery({
    queryKey: ["designations"],
    queryFn: listDesignations,
    enabled:
      !!user &&
      (user.role === "super_admin" || user.role === "admin"),
  });

  const teamLeadsQ = useQuery({
    queryKey: ["teamLeads"],
    queryFn: listTeamLeads,
    enabled:
      !!user &&
      (user.role === "super_admin" || user.role === "admin"),
  });

  const locationsQ = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
    enabled:
      !!user &&
      (user.role === "super_admin" || user.role === "admin"),
  });

  const scope = data ?? [];

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return scope.filter((e) => {
      const matchesSearch =
        !search ||
        [
          e.name,
          e.email,
          e.employeeId,
          e.department,
          e.designation,
          e.teamLead,
          e.location,
          e.joiningDate,
        ].some((f) =>
          String(f ?? "")
            .toLowerCase()
            .includes(search)
        );

      const matchesDepartment =
        departmentFilter === "all" ||
        String(e.department ?? "") === departmentFilter;

      const matchesDesignation =
        designationFilter === "all" ||
        String(e.designation ?? "") === designationFilter;

      const matchesTeamLead =
        teamLeadFilter === "all" ||
        String(e.teamLead ?? "") === teamLeadFilter;

      const matchesLocation =
        locationFilter === "all" ||
        String(e.location ?? "") === locationFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesDesignation &&
        matchesTeamLead &&
        matchesLocation
      );
    });
  }, [
    scope,
    q,
    departmentFilter,
    designationFilter,
    teamLeadFilter,
    locationFilter,
  ]);

  if (!user) return <Navigate to="/login" />;

  if (
    user.role !== "super_admin" &&
    user.role !== "admin"
  ) {
    return <Navigate to="/" />;
  }


  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {user.role === "super_admin"
                  ? "All Employees"
                  : "My Team"}
              </CardTitle>

              <CardDescription>
                {isLoading
                  ? "Loading…"
                  : `${filtered.length} of ${scope.length} shown`}
              </CardDescription>
            </div>

            <Input
              placeholder="Search by name, ID, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              placeholder="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departmentsQ.data ?? []}
            />

            <FilterSelect
              placeholder="Designation"
              value={designationFilter}
              onChange={setDesignationFilter}
              options={designationsQ.data ?? []}
            />

            <FilterSelect
              placeholder="Team Lead"
              value={teamLeadFilter}
              onChange={setTeamLeadFilter}
              options={teamLeadsQ.data ?? []}
            />

            <FilterSelect
              placeholder="Location"
              value={locationFilter}
              onChange={setLocationFilter}
              options={locationsQ.data ?? []}
            />
          </div>

          {/* Clear filters */}
          {(departmentFilter !== "all" ||
            designationFilter !== "all" ||
            teamLeadFilter !== "all" ||
            locationFilter !== "all" ||
            q) && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => {
                setQ("");
                setDepartmentFilter("all");
                setDesignationFilter("all");
                setTeamLeadFilter("all");
                setLocationFilter("all");
              }}
            >
              Clear all filters
            </button>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full"
                />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load employees:{" "}
              {error instanceof Error
                ? error.message
                : String(error)}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Joining Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((e) => (
                    <TableRow
                      key={e.employeeId}
                      onClick={() =>
                        setSelected(e.employeeId)
                      }
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs">
                        {e.employeeId}
                      </TableCell>

                      <TableCell className="font-medium">
                        {e.name}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {e.email}
                      </TableCell>

                      <TableCell>
                        {e.department || "—"}
                      </TableCell>

                      <TableCell>
                        {e.designation || "—"}
                      </TableCell>

                      <TableCell>
                        {e.teamLead || "—"}
                      </TableCell>

                      <TableCell>
                        {e.location || "—"}
                      </TableCell>

                      <TableCell>
                        {formatJoiningDate(e.joiningDate)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground"
                      >
                        No employees match your search or filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDetailModal
        employeeId={selected}
        onOpenChange={(open) =>
          !open && setSelected(null)
        }
      />
    </div>
  );
}

function FilterSelect({
  placeholder,
  value,
  onChange,
  options,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const uniqueOptions = Array.from(
    new Set(
      options
        .map((option) => String(option).trim())
        .filter(Boolean)
    )
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">
          All {placeholder}
        </SelectItem>

        {uniqueOptions.map((option) => (
          <SelectItem
            key={option}
            value={option}
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function formatJoiningDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB");
}
