import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RefreshButton } from "@/components/refresh-button";
import { AcentricBadge } from "@/components/acentric-badge";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Super Admin Dashboard",
  "/admin": "Team Overview",
  "/admin/lists": "Manage Lists",
  "/me": "My Performance",
  "/employees": "Employee Management",
  "/users": "User & Role Management",
  "/upload": "Upload Center",
};

function AppLayout() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return <Navigate to="/login" />;
  if (user.role === "no_access") return <Navigate to="/pending" />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2.5 border-b bg-background px-3 sm:px-4">
            <SidebarTrigger />
            <h1 className="truncate text-xs font-semibold sm:text-sm">{PAGE_TITLES[pathname] ?? "Appraise"}</h1>
            <div className="ml-auto flex items-center gap-2">
              <RefreshButton />
            </div>
          </header>
          <main className="flex-1 bg-muted/20 p-3 sm:p-5 md:p-6">
            <Outlet />
          </main>
          <AcentricBadge />
        </div>
      </div>
    </SidebarProvider>
  );
}
