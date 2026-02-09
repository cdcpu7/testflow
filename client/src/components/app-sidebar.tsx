import { Plus, Folder, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

interface AppSidebarProps {
  onNewProject: () => void;
}

interface AuthUser {
  id: string;
  username: string;
}

const statusColors: Record<string, string> = {
  진행중: "bg-blue-500/20 text-blue-400",
  완료: "bg-green-500/20 text-green-400",
  "프로젝트 중단": "bg-red-500/20 text-red-400",
};

export function AppSidebar({ onNewProject }: AppSidebarProps) {
  const [location] = useLocation();

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries();
    },
  });

  const displayName = user?.username || "사용자";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
              {displayName}
            </h1>
            <p className="text-xs text-muted-foreground">
              시험관리
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex-1 overflow-hidden">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2 flex items-center justify-between gap-2">
            <Link href="/" className="cursor-pointer hover:text-foreground transition-colors" data-testid="link-projects-list">
              프로젝트 목록
            </Link>
            <Badge variant="secondary" className="text-xs">
              {projects.length}
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent className="overflow-hidden">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <SidebarMenu>
                {projects.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    프로젝트가 없습니다
                  </div>
                ) : (
                  projects.map((project) => {
                    const isActive = location === `/projects/${project.id}`;
                    return (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          data-testid={`nav-project-${project.id}`}
                        >
                          <Link href={`/projects/${project.id}`}>
                            <Folder className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1">{project.name}</span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColors[project.status] || ""}`}
                            >
                              {project.status}
                            </Badge>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          onClick={onNewProject}
          className="w-full gap-2"
          data-testid="button-new-project"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </Button>
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full gap-2"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
