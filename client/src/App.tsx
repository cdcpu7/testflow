import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectsList } from "@/pages/projects-list";
import { ProjectDetail } from "@/pages/project-detail";
import NotFound from "@/pages/not-found";

function Router({ showNewProjectForm, onCloseNewProjectForm }: {
  showNewProjectForm: boolean;
  onCloseNewProjectForm: () => void;
}) {
  return (
    <Switch>
      <Route path="/">
        <ProjectsList
          showNewProjectForm={showNewProjectForm}
          onCloseNewProjectForm={onCloseNewProjectForm}
        />
      </Route>
      <Route path="/project/:id">
        {(params) => <ProjectDetail projectId={params.id} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar onNewProject={() => setShowNewProjectForm(true)} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center gap-4 p-3 border-b border-border shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <h2 className="text-sm font-medium text-muted-foreground">시험업무 관리 시스템</h2>
              </header>
              <main className="flex-1 overflow-auto">
                <Router
                  showNewProjectForm={showNewProjectForm}
                  onCloseNewProjectForm={() => setShowNewProjectForm(false)}
                />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
