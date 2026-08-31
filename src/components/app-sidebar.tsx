import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Upload,
  User,
  UserCog,
  Users,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      { title: "My Performance", url: "/me", icon: User },
    );
  } else if (user.role === "admin") {
    items.push(
      { title: "Team Overview", url: "/admin", icon: BarChart3 },
      { title: "My Team", url: "/employees", icon: Users },
      { title: "My Performance", url: "/me", icon: User },
    );
  } else if (user.role === "user") {
    items.push({ title: "My Performance", url: "/me", icon: User });
  }

  return (
    <Sidebar collapsible="icon">
      {/* Header - Aligned to h-14 with top navigation bar */}
      <SidebarHeader className="flex h-14 items-center justify-center border-b px-3">
        <div className="flex w-full items-center gap-2.5">
          <div className="flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            JB
          </div>
          <span className="truncate text-sm font-bold tracking-tight text-foreground group-data-[state=collapsed]:hidden">
            Appraise
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation Items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[state=collapsed]:hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2.5 text-xs font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - Clean handling for both expanded & icon modes */}
      <SidebarFooter className="border-t p-2">
        <div className="flex flex-col gap-2 group-data-[state=collapsed]:items-center">
          <div className="flex flex-col leading-tight px-1 group-data-[state=collapsed]:hidden">
            <span className="truncate text-xs font-bold text-foreground">{user.name}</span>
            <span className="truncate text-[10px] text-muted-foreground">{ROLE_LABEL[user.role]}</span>
          </div>

          {/* Expanded button */}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="h-8 justify-start text-xs font-medium group-data-[state=collapsed]:hidden"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </Button>

          {/* Collapsed icon-only button */}
          <div className="hidden group-data-[state=collapsed]:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Sign out
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
