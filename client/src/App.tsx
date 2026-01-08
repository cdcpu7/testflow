import { useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectsList } from "@/pages/projects-list";
import { ProjectDetail } from "@/pages/project-detail";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

interface AuthUser {
  id: string;
  username: string;
}

function MainLayout() {
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar onNewProject={() => setShowNewProjectForm(true)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-4 p-3 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h2 className="text-sm font-medium text-muted-foreground">시험업무 관리 시스템</h2>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <ProjectsList
                  showNewProjectForm={showNewProjectForm}
                  onCloseNewProjectForm={() => setShowNewProjectForm(false)}
                />
              </Route>
              <Route path="/projects/:id">
                {(params) => <ProjectDetail projectId={params.id} />}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
  });

  const isAuthenticated = !!user;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">로딩중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location !== "/login" && location !== "/register") {
      return <Redirect to="/login" />;
    }
    
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  if (location === "/login" || location === "/register") {
    return <Redirect to="/" />;
  }

  return <MainLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
