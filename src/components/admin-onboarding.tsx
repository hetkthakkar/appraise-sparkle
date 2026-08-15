import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/mock-auth";
import {
  listDepartments,
  listDesignations,
  listLocations,
  listTeamLeads,
  updateEmployeeDetails,
  type SheetEmployee,
} from "@/lib/sheetsApi";

export function AdminOnboarding({ me }: { me: SheetEmployee }) {
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

  const [department, setDepartment] = useState(me.department ?? "");
  const [designation, setDesignation] = useState(me.designation?.trim() || "Team Lead");
  const [teamLead, setTeamLead] = useState(me.teamLead ?? "");
  const [location, setLocation] = useState(me.location ?? "");
  const [joiningDate, setJoiningDate] = useState(
    me.joiningDate ? String(me.joiningDate).slice(0, 10) : ""
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateEmployeeDetails(
        user!.email,
        department,
        designation,
        teamLead,
        location,
        joiningDate
      ),

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["myDashboard"] }),
        qc.invalidateQueries({ queryKey: ["employees"] }),
        qc.invalidateQueries({ queryKey: ["performance"] }),
      ]);

      toast.success("Profile completed");
    },

    onError: (e) => {
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const loading =
    deptQ.isLoading ||
    desigQ.isLoading ||
    locQ.isLoading ||
    leadQ.isLoading;

  const canSubmit =
    !!department.trim() &&
    !!designation.trim() &&
    !!location.trim() &&
    !!joiningDate.trim() &&
    !mutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {me.name.split(" ")[0]}</CardTitle>
          <CardDescription>
            Please complete your details to finish setting up your Team Lead profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <Field label="Employee ID" value={me.employeeId} />
          <Field label="Name" value={me.name} />
          <Field label="Email" value={me.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>Fill out your details to continue.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) {
                  mutation.mutate();
                }
              }}
            >
              {/* Department */}
              <Picker
                label="Department"
                value={department}
                onChange={setDepartment}
                options={deptQ.data ?? []}
              />

              {/* Designation */}
              <Picker
                label="Designation"
                value={designation}
                onChange={setDesignation}
                options={Array.from(new Set(["Team Lead", ...(desigQ.data ?? [])]))}
              />

              {/* Team Lead (Optional for Team Leads) */}
              <Picker
                label="Team Lead (Optional)"
                value={teamLead}
                onChange={setTeamLead}
                options={leadQ.data ?? []}
              />

              {/* Location */}
              <Picker
                label="Location"
                value={location}
                onChange={setLocation}
                options={locQ.data ?? []}
              />

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="adminJoiningDate">
                  Joining Date
                </label>
                <Input
                  id="adminJoiningDate"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!canSubmit}>
                  {mutation.isPending ? "Saving…" : "Save & continue"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
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
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No {label.toLowerCase()} options available.</p>
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
