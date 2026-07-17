import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCard } from "@/components/upload-card";
import { useAuth } from "@/lib/mock-auth";
import { uploadEmployees, uploadPerformance, type SheetEmployee, type SheetPerformance } from "@/lib/sheetsApi";

export const Route = createFileRoute("/_app/upload")({
  component: UploadCenter,
});

function UploadCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Center</h2>
        <p className="text-sm text-muted-foreground">
          Drop Excel files here. They'll sync to the Google Sheets backend.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {user.role === "super_admin" && (
          <UploadCard
            title="Employee Master Upload"
            description="Onboard or update the employee directory."
            columns={["Employee ID", "Name", "Email", "Department", "Designation", "Team Lead"]}
            onUpload={async (rows) => {
              const result = await uploadEmployees(user.email, rows as unknown as SheetEmployee[]);
              qc.invalidateQueries({ queryKey: ["employees"] });
              return result;
            }}
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
          onUpload={async (rows) => {
            const result = await uploadPerformance(user.email, rows as unknown as SheetPerformance[]);
            qc.invalidateQueries({ queryKey: ["performance"] });
            return result;
          }}
        />
      </div>
    </div>
  );
}
