import { useEffect } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/pending")({
  component: Pending,
});

function Pending() {
  const { user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    // Check immediately
    refreshProfile();
    
    // Poll every 1 second while waiting (faster detection)
    const interval = setInterval(() => {
      refreshProfile();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [user, refreshProfile]);

  // If role changed, redirect immediately
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "no_access") {
    navigate({ to: "/" });
    return null;
  }

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
    </div>
  );
}
