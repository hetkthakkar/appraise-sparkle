import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

export function EmployeeOnboarding({ me }: { me: SheetEmployee }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const deptQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const desigQ = useQuery({ queryKey: ["designations"], queryFn: listDesignations });
  const locQ = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const leadQ = useQuery({ queryKey: ["teamLeads"], queryFn: listTeamLeads });

  const [department, setDepartment] = useState(me.department ?? "");
  const [designation, setDesignation] = useState(me.designation ?? "");
  const [teamLead, setTeamLead] = useState(me.teamLead ?? "");
  const [location, setLocation] = useState(me.location ?? "");
  const [joiningDate, setJoiningDate] = useState(me.joiningDate ?? "");

  const missing = useMemo(() => {
    const out: string[] = [];
    if ((deptQ.data ?? []).length === 0) out.push("Department");
    if ((desigQ.data ?? []).length === 0) out.push("Designation");
    if ((locQ.data ?? []).length === 0) out.push("Location");
    return out;
  }, [deptQ.data, desigQ.data, locQ.data]);

  const m = useMutation({
    mutationFn: () =>
      updateEmployeeDetails(user!.email, department, designation, teamLead, location),
    onSuccess: () => {
      toast.success("Profile completed");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) =>
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  const loading = deptQ.isLoading || desigQ.isLoading || locQ.isLoading || leadQ.isLoading;
  const canSubmit = !!department && !!designation && !!teamLead && !!location && !m.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {me.name.split(" ")[0]}</CardTitle>
          <CardDescription>
            Please confirm your details to finish setting up your profile.
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
          <CardDescription>Select the values that apply to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : missing.length > 0 ? (
            <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              Your administrator hasn't set up {missing.join(" / ")} options yet. Please check
              back later.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) m.mutate();
              }}
            >
              <Picker
                label="Department"
                value={department}
                onChange={setDepartment}
                options={deptQ.data ?? []}
              />
              <Picker
                label="Designation"
                value={designation}
                onChange={setDesignation}
                options={desigQ.data ?? []}
              />
              <Picker
                label="Team Lead"
                value={teamLead}
                onChange={setTeamLead}
                options={leadQ.data ?? []}
                emptyHint="No team leads available yet."
              />
              <Picker
                label="Location"
                value={location}
                onChange={setLocation}
                options={locQ.data ?? []}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!canSubmit}>
                  {m.isPending ? "Saving…" : "Save & continue"}
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
  emptyHint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  emptyHint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {emptyHint ?? `No ${label.toLowerCase()} options available.`}
        </p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
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
