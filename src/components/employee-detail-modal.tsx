import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function EmployeeDetailModal({ employeeId, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const detailQ = useQuery({
    queryKey: ["employeeDetail", employeeId],
    queryFn: () => getEmployeeDetail(user!.email, employeeId!),
    enabled: !!user && !!employeeId,
  });

  useEffect(() => {
    setEditing(false);
  }, [employeeId]);

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detailQ.data?.profile?.name ?? "Employee detail"}</DialogTitle>
          <DialogDescription>Profile and performance history.</DialogDescription>
        </DialogHeader>
        {detailQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detailQ.isError ? (
          <p className="text-sm text-destructive">
            Failed to load:{" "}
            {detailQ.error instanceof Error ? detailQ.error.message : String(detailQ.error)}
          </p>
        ) : detailQ.data ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? "Close editor" : "Edit details"}
              </Button>
            </div>
            {editing && (
              <EditForm
                employeeId={employeeId!}
                initial={detailQ.data.profile}
                onDone={() => {
                  setEditing(false);
                  qc.invalidateQueries({ queryKey: ["employeeDetail", employeeId] });
                  qc.invalidateQueries({ queryKey: ["employees"] });
                }}
              />
            )}
            <PerformanceView data={detailQ.data} compact />
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
  initial: { department?: string; designation?: string; teamLead?: string; location?: string; joiningDate?: string };
  onDone: () => void;
}) {
  const { user } = useAuth();
  const deptQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const desigQ = useQuery({ queryKey: ["designations"], queryFn: listDesignations });
  const locQ = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const leadQ = useQuery({ queryKey: ["teamLeads"], queryFn: listTeamLeads });

  const [department, setDepartment] = useState(initial.department ?? "");
  const [designation, setDesignation] = useState(initial.designation ?? "");
  const [teamLead, setTeamLead] = useState(initial.teamLead ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [joiningDate, setJoiningDate] = useState(
    initial.joiningDate ? String(initial.joiningDate).slice(0, 10) : ""
  );

  const m = useMutation({
    mutationFn: () =>
      adminUpdateEmployee(user!.email, employeeId, {
        department,
        designation,
        teamLead,
        location,
        joiningDate,
      }),
    onSuccess: () => {
      toast.success("Employee updated");
      onDone();
    },
    onError: (e) =>
      toast.error("Update failed", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  return (
    <form
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <Picker label="Department" value={department} onChange={setDepartment} options={deptQ.data ?? []} />
      <Picker label="Designation" value={designation} onChange={setDesignation} options={desigQ.data ?? []} />
      <Picker label="Team Lead" value={teamLead} onChange={setTeamLead} options={leadQ.data ?? []} />
      <Picker label="Location" value={location} onChange={setLocation} options={locQ.data ?? []} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="edit-joining">Joining Date</label>
        <Input
          id="edit-joining"
          type="date"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.target.value)}
        />
      </div>
      <div className="flex items-end justify-end sm:col-span-2">
        <Button type="submit" disabled={m.isPending}>
          {m.isPending ? "Saving…" : "Save changes"}
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
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
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
    </div>
  );
}
