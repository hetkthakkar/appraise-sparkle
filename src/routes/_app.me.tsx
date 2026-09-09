import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/mock-auth";
import { getMyDashboard } from "@/lib/sheetsApi";
import { EmployeeOnboarding } from "@/components/employee-onboarding";
import { PerformanceView } from "@/components/performance-view";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";

export const Route = createFileRoute("/_app/me")({
  component: MyPerformance,
});

function MyPerformance() {
  const { user } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);

  const dashQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user,
  });

  if (!user) return <Navigate to="/login" />;
  if (!["user", "admin", "super_admin"].includes(user.role))   return <Navigate to="/" />;

  if (dashQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const errMessage = dashQ.isError
    ? dashQ.error instanceof Error
      ? dashQ.error.message
      : String(dashQ.error)
    : "";

  const isRecordNotFound = /record not found|not found|no employee/i.test(errMessage);

  if (dashQ.isError && !isRecordNotFound) {
    return (
      <p className="p-6 text-sm text-destructive">
        Failed to load your dashboard: {errMessage}
      </p>
    );
  }

  const dashboard = dashQ.data;
  const me = dashboard?.profile ?? {
    employeeId: user.employeeId ?? "",
    name: user.name,
    email: user.email,
    department: "",
    designation: "",
    teamLead: "",
    location: "",
    joiningDate: "",
  };

  const needsOnboarding =
    !dashboard ||
    !dashboard.profile ||
    isRecordNotFound ||
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.location?.trim() ||
    !String(me.joiningDate ?? "").trim();

  if (needsOnboarding) return <EmployeeOnboarding me={me} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PerformanceView
        data={dashboard}
        onEditProfile={user.role === "admin" || user.role === "super_admin" ? () => setEditingProfile(true) : undefined}
      />
      {(user.role === "admin" || user.role === "super_admin") && (
        <ProfileEditDialog
          open={editingProfile}
          onOpenChange={setEditingProfile}
          profile={me}
        />
      )}
    </div>
  );
}
