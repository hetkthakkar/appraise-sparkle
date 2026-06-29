import { createFileRoute, Navigate } from "@tanstack/react-router";
import { UploadCard } from "@/components/upload-card";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/_app/upload")({
  component: UploadCenter,
});

function UploadCenter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Center</h2>
        <p className="text-sm text-muted-foreground">
          Drop Excel files here. They'll sync to the Google Sheets backend on the next phase.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {user.role === "super_admin" && (
          <UploadCard
            title="Employee Master Upload"
            description="Onboard or update the employee directory."
            columns={["Employee ID", "Name", "Email", "Department", "Designation", "Team Lead"]}
          />
        )}
        <UploadCard
          title="Monthly Performance Upload"
          description="Upload the current month's KPI sheet for your team."
          columns={[
            "Month",
            "Employee ID",
            "Name",
            "Production Target",
            "Production Actual",
            "Ticket Target",
            "Ticket Actual",
            "Internal Errors Target",
            "Internal Errors Actual",
            "Attendance (0-10)",
            "Behavior (0-5)",
            "Manager Remarks",
          ]}
        />
      </div>
    </div>
  );
}
