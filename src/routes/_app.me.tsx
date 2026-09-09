import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  Clock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  UploadCloud,
  User,
  UserSearch,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, type AuthUser } from "@/lib/mock-auth";
import { getMyDashboard } from "@/lib/sheetsApi";
import { EmployeeOnboarding } from "@/components/employee-onboarding";
import { PerformanceView } from "@/components/performance-view";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";

export const Route = createFileRoute("/_app/me")({
  component: MyPerformance,
});

function MyPerformance() {
  const { user, signOut } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);

  const dashQ = useQuery({
    queryKey: ["myDashboard", user?.email],
    queryFn: () => getMyDashboard(user!.email),
    enabled: !!user,
    retry: 1,
  });

  if (!user) return <Navigate to="/login" />;
  if (!["user", "admin", "super_admin"].includes(user.role)) return <Navigate to="/" />;

  if (dashQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Handle errors
  if (dashQ.isError) {
    const errMessage =
      dashQ.error instanceof Error ? dashQ.error.message : String(dashQ.error);

    // If the error indicates missing employee record in the sheet, show the pending setup view
    const isRecordNotFound =
      /record not found|not found|no employee|profile not found/i.test(errMessage);

    if (isRecordNotFound) {
      return (
        <NoEmployeeRecord
          user={user}
          onRefresh={() => dashQ.refetch()}
          isRefreshing={dashQ.isFetching}
          signOut={signOut}
        />
      );
    }

    // Otherwise show unexpected error state with retry
    return (
      <DashboardError
        error={dashQ.error}
        onRetry={() => dashQ.refetch()}
        isRetrying={dashQ.isFetching}
        signOut={signOut}
      />
    );
  }

  const dashboard = dashQ.data;
  const me = dashboard?.profile;

  // If query succeeded but no profile was returned
  if (!dashboard || !me) {
    return (
      <NoEmployeeRecord
        user={user}
        onRefresh={() => dashQ.refetch()}
        isRefreshing={dashQ.isFetching}
        signOut={signOut}
      />
    );
  }

  const needsOnboarding =
    !me.department?.trim() ||
    !me.designation?.trim() ||
    !me.location?.trim() ||
    !String(me.joiningDate ?? "").trim();

  if (needsOnboarding) return <EmployeeOnboarding me={me} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PerformanceView
        data={dashboard}
        onEditProfile={
          user.role === "admin" || user.role === "super_admin"
            ? () => setEditingProfile(true)
            : undefined
        }
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

function NoEmployeeRecord({
  user,
  onRefresh,
  isRefreshing,
  signOut,
}: {
  user: AuthUser;
  onRefresh: () => void;
  isRefreshing: boolean;
  signOut: () => void;
}) {
  const isAdminOrSuper = user.role === "admin" || user.role === "super_admin";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center p-4">
      <Card className="w-full overflow-hidden border-border/80 shadow-md">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-primary" />
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
            <UserSearch className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Employee Profile Pending Setup
          </CardTitle>
          <CardDescription className="mx-auto max-w-md text-balance text-sm text-muted-foreground mt-2">
            You have signed in successfully, but your Google account is not yet linked to an active employee profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8">
          {/* User details card */}
          <div className="rounded-xl border bg-muted/40 p-4 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Authenticated Account
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{user.name || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground">System Role:</span>
              <Badge variant="outline" className="capitalize text-xs font-medium">
                {user.role.replace("_", " ")}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
              >
                Awaiting Directory Link
              </Badge>
            </div>
          </div>

          {/* Next steps explanation */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium text-sm text-foreground">
              <Clock className="h-4 w-4 text-amber-600" />
              What needs to happen next?
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground pl-6 list-disc">
              <li>
                Your HR administrator or Team Lead needs to add your employee record (with your email{" "}
                <strong className="text-foreground">{user.email}</strong> and Employee ID) to the employee master database.
              </li>
              <li>
                Once your record is created, your monthly performance metrics, KPI ratings, and appraisal reports will display here automatically.
              </li>
              <li>
                If you were just added to the directory, click <strong>"Check Again"</strong> below to refresh your status immediately.
              </li>
            </ul>
          </div>

          {/* Admin shortcut if applicable */}
          {isAdminOrSuper && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ShieldAlert className="h-4 w-4" />
                Administrator Quick Actions
              </div>
              <p className="text-xs text-muted-foreground">
                As an administrator, you can upload the employee roster or manage staff records:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="default" className="gap-1.5 h-8 text-xs">
                  <Link to="/upload">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Go to Upload Center
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                  <Link to="/employees">
                    <Users className="h-3.5 w-3.5" />
                    Employee Directory
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Primary Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="default"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Checking..." : "Check Again"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={signOut}
              className="w-full sm:w-auto gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardError({
  error,
  onRetry,
  isRetrying,
  signOut,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
  signOut: () => void;
}) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-4">
      <Card className="w-full border-destructive/30 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold">Failed to load dashboard</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            An unexpected error occurred while communicating with the Google Sheets backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-mono break-all">
            {message}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
            <Button size="sm" onClick={onRetry} disabled={isRetrying} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

