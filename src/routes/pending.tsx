import { useEffect } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useAuth } from "@/lib/mock-auth";
import { AcentricBadge } from "@/components/acentric-badge";

export const Route = createFileRoute("/pending")({
  component: Pending,
});

function Pending() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect instantly when role is assigned (via global 500ms sync from mock-auth)
  useEffect(() => {
    if (user && user.role !== "no_access") {
      navigate({ to: "/" });
    }
  }, [user?.role, navigate]);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "no_access") return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Awaiting approval</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is awaiting approval from the administrator. You'll get
              access as soon as a role is assigned.
            </p>
          </div>
          <div className="w-full rounded-md border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{user.name}</div>
            <div>{user.email}</div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
      <AcentricBadge />
    </div>
  );
}
