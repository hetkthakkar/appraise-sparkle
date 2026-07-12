import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === "no_access") return <Navigate to="/pending" />;
  if (user.role === "super_admin") return <Navigate to="/dashboard" />;
  if (user.role === "admin") return <Navigate to="/admin" />;
  return <Navigate to="/me" />;
}
