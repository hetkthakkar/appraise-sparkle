import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Upload, UserCog, User, LogOut, BarChart3, ListChecks } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: typeof Users };

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;

  const items: Item[] = [];
 if (user.role === "super_admin") {
  items.push(
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Employees", url: "/employees", icon: Users },
    { title: "Users & Roles", url: "/users", icon: UserCog },
    { title: "Manage Lists", url: "/admin/lists", icon: ListChecks },
    { title: "Upload Center", url: "/upload", icon: Upload },

    // Add this
    { title: "My Performance", url: "/me", icon: User }
  );
} else if (user.role === "admin") {
  items.push(
    { title: "Team Overview", url: "/admin", icon: BarChart3 },
    { title: "My Team", url: "/employees", icon: Users },
    { title: "Upload Center", url: "/upload", icon: Upload },

    // Add this
    { title: "My Performance", url: "/me", icon: User }
  );
} else if (user.role === "user") {
  items.push(
    { title: "My Performance", url: "/me", icon: User }
  );
}

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            EP
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Appraise</span>
            <span className="text-xs text-muted-foreground">Performance Suite</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex flex-col gap-2 px-2 py-2">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
