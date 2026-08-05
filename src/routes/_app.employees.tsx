import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/mock-auth";
import { listEmployees, listDepartments, listDesignations, listLocations, listTeamLeads } from "@/lib/sheetsApi";
import { EmployeeDetailModal } from "@/components/employee-detail-modal";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState("");
  const [filterDesig, setFilterDesig] = useState("");
  const [filterTeamLead, setFilterTeamLead] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["employees", user?.email],
    queryFn: () => listEmployees(user!.email),
    enabled: !!user && (user.role === "super_admin" || user.role === "admin"),
  });

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

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  const scope = data ?? [];
  const filtered = scope.filter((e) => {
    const matchesSearch = [e.name, e.email, e.employeeId, e.department].some((f) =>
      String(f ?? "").toLowerCase().includes(q.toLowerCase())
    );
    const matchesDept = !filterDept || e.department === filterDept;
    const matchesDesig = !filterDesig || e.designation === filterDesig;
    const matchesTeamLead = !filterTeamLead || e.teamLead === filterTeamLead;
    const matchesLocation = !filterLocation || e.location === filterLocation;

    return matchesSearch && matchesDept && matchesDesig && matchesTeamLead && matchesLocation;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <CardHeader>
          <div className="mb-4">
            <CardTitle>{user.role === "super_admin" ? "All Employees" : "My Team"}</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${filtered.length} of ${scope.length} shown`}
            </CardDescription>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Search by name, ID, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />

            <div className="grid gap-3 sm:grid-cols-4">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {(deptQ.data ?? []).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDesig} onValueChange={setFilterDesig}>
                <SelectTrigger>
                  <SelectValue placeholder="Designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Designations</SelectItem>
                  {(desigQ.data ?? []).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTeamLead} onValueChange={setFilterTeamLead}>
                <SelectTrigger>
                  <SelectValue placeholder="Team Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Team Leads</SelectItem>
                  {(leadQ.data ?? []).map((tl) => (
                    <SelectItem key={tl} value={tl}>{tl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {(locQ.data ?? []).map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load employees: {error instanceof Error ? error.message : String(error)}
            </p>
          ) : (
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
                    onClick={() => setSelected(e.employeeId)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs">{e.employeeId}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.designation}</TableCell>
                    <TableCell>{e.teamLead}</TableCell>
                    <TableCell>{e.location ?? "—"}</TableCell>
                    <TableCell>{e.joiningDate ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No employees match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <EmployeeDetailModal
        employeeId={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
