import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/mock-auth";
import { getMyDashboard } from "@/lib/sheetsApi";
import { EmployeeOnboarding } from "@/components/employee-onboarding";
import { PerformanceView } from "@/components/performance-view";

export const Route = createFileRoute("/_app/me")({
  component: MyPerformance,
});

function MyPerformance() {
  const { user } = useAuth();

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

  if (dashQ.isError) {
    return (
      <p className="p-6 text-sm text-destructive">
        Failed to load your dashboard:{" "}
        {dashQ.error instanceof Error ? dashQ.error.message : String(dashQ.error)}
      </p>
    );
  }

  const me = dashQ.data?.profile;
  if (!me) {
    return <p className="p-6 text-muted-foreground">No employee record found for your account.</p>;
  }

  const needsOnboarding =
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.teamLead?.trim() ||
    !me.location?.trim() ||
    !String(me.joiningDate ?? "").trim();

  if (needsOnboarding) return <EmployeeOnboarding me={me} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PerformanceView data={dashQ.data!} />
    </div>
  );
}
