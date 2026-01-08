import { Plus, Folder, LogOut, LogIn, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { Project } from "@shared/schema";

interface AppSidebarProps {
  onNewProject: () => void;
}

const statusColors: Record<string, string> = {
  진행중: "bg-blue-500/20 text-blue-400",
  완료: "bg-green-500/20 text-green-400",
  보류: "bg-yellow-500/20 text-yellow-400",
};

export function AppSidebar({ onNewProject }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const displayName = user?.firstName || user?.email?.split("@")[0] || "사용자";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
                {displayName}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {user.email || "시험관리"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">시험관리</h1>
              <p className="text-xs text-muted-foreground">로그인 필요</p>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex-1 overflow-hidden">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2 flex items-center justify-between gap-2">
            <span>프로젝트 목록</span>
            <Badge variant="secondary" className="text-xs">
              {projects.length}
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent className="overflow-hidden">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <SidebarMenu>
                {!isAuthenticated ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    로그인하여 프로젝트를 관리하세요
                  </div>
                ) : projects.length === 0 ? (
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
        {isAuthenticated ? (
          <>
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
              onClick={() => logout()}
              className="w-full gap-2"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </>
        ) : (
          <Button
            asChild
            className="w-full gap-2"
            data-testid="button-login"
          >
            <a href="/api/login">
              <LogIn className="w-4 h-4" />
              로그인
            </a>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
