import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/mock-auth";
import {
  listDepartments,
  listDesignations,
  listLocations,
  listTeamLeads,
  updateEmployeeDetails,
  type SheetEmployee,
} from "@/lib/sheetsApi";
import { cn } from "@/lib/utils";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SheetEmployee;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function ProfileEditDialog({ open, onOpenChange, profile }: ProfileEditDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [department, setDepartment] = useState(profile.department ?? "");
  const [designation, setDesignation] = useState(profile.designation ?? "");
  const [teamLead, setTeamLead] = useState(profile.teamLead ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [joiningDate, setJoiningDate] = useState<Date | undefined>(parseDate(profile.joiningDate));

  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: open });
  const designations = useQuery({ queryKey: ["designations"], queryFn: listDesignations, enabled: open });
  const teamLeads = useQuery({ queryKey: ["teamLeads"], queryFn: listTeamLeads, enabled: open });
  const locations = useQuery({ queryKey: ["locations"], queryFn: listLocations, enabled: open });

  useEffect(() => {
    if (!open) return;
    setDepartment(profile.department ?? "");
    setDesignation(profile.designation ?? "");
    setTeamLead(profile.teamLead ?? "");
    setLocation(profile.location ?? "");
    setJoiningDate(parseDate(profile.joiningDate));
  }, [open, profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Your session is no longer available.");
      return updateEmployeeDetails(
        user.email,
        department,
        designation,
        teamLead,
        location,
        joiningDate ? format(joiningDate, "yyyy-MM-dd") : "",
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["myDashboard"] }),
        queryClient.refetchQueries({ queryKey: ["employees"] }),
      ]);
      toast.success("Profile updated");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error("Could not update profile", {
        description: error instanceof Error ? error.message : String(error),
      }),
  });

  const canSave = Boolean(department && designation && teamLead && location && joiningDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit my profile</DialogTitle>
          <DialogDescription>Update your employee master details.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) mutation.mutate();
          }}
        >
          <ProfileSelect label="Department" value={department} onChange={setDepartment} options={departments.data ?? []} />
          <ProfileSelect label="Designation" value={designation} onChange={setDesignation} options={designations.data ?? []} />
          <ProfileSelect label="Team Lead" value={teamLead} onChange={setTeamLead} options={teamLeads.data ?? []} />
          <ProfileSelect label="Location" value={location} onChange={setLocation} options={locations.data ?? []} />
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Joining Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !joiningDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="size-4" />
                  {joiningDate ? format(joiningDate, "PPP") : "Select joining date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={joiningDate}
                  onSelect={setJoiningDate}
                  captionLayout="dropdown"
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSelect({
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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}