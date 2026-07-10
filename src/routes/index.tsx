import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (user.role === "no_access") return <Navigate to="/pending" />;
  if (user.role === "super_admin") return <Navigate to="/dashboard" />;
  if (user.role === "admin") return <Navigate to="/admin" />;
  return <Navigate to="/me" />;
}

function FullscreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
