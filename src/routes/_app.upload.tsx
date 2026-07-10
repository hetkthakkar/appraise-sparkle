import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UploadCard } from "@/components/upload-card";
import { useAuth } from "@/lib/mock-auth";
import { EMPLOYEE_COLUMNS, PERFORMANCE_COLUMNS } from "@/lib/excel";
import { upsertEmployees, upsertPerformance } from "@/lib/upload.functions";

export const Route = createFileRoute("/_app/upload")({
  component: UploadCenter,
});

function UploadCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const upEmp = useServerFn(upsertEmployees);
  const upPerf = useServerFn(upsertPerformance);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Center</h2>
        <p className="text-sm text-muted-foreground">
          Drop Excel files here. Columns are validated automatically and a preview shows before import.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        {user.role === "super_admin" && (
          <UploadCard
            title="Employee Master Upload"
            description="Onboard or update the employee directory. Existing rows are matched by Employee ID."
            columns={EMPLOYEE_COLUMNS}
            onImport={async (rows) => {
              const r = await upEmp({ data: { rows: rows as any } });
              qc.invalidateQueries({ queryKey: ["employees"] });
              qc.invalidateQueries({ queryKey: ["users-with-roles"] });
              return r;
            }}
          />
        )}
        <UploadCard
          title="Monthly Performance Upload"
          description="Upload monthly KPI data. Existing rows are matched by Month + Employee ID."
          columns={PERFORMANCE_COLUMNS}
          onImport={async (rows) => {
            const r = await upPerf({ data: { rows: rows as any } });
            qc.invalidateQueries({ queryKey: ["performance"] });
            return r;
          }}
        />
      </div>
    </div>
  );
}
