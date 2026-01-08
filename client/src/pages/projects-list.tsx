import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/project-card";
import { ProjectForm } from "@/components/project-form";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, TestItem, InsertProject } from "@shared/schema";

interface ProjectsListProps {
  showNewProjectForm: boolean;
  onCloseNewProjectForm: () => void;
}

export function ProjectsList({ showNewProjectForm, onCloseNewProjectForm }: ProjectsListProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: testItems = [] } = useQuery<TestItem[]>({
    queryKey: ["/api/test-items"],
  });

  const createProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onCloseNewProjectForm();
      toast({ title: "프로젝트가 생성되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertProject }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
      toast({ title: "프로젝트가 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-items"] });
      toast({ title: "프로젝트가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProjectTestItems = (projectId: string) =>
    testItems.filter((item) => item.projectId === projectId);

  if (projectsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          총 {filteredProjects.length}개 프로젝트
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">프로젝트가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            새 프로젝트를 추가하여 시험 관리를 시작하세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              testItems={getProjectTestItems(project.id)}
              onClick={() => setLocation(`/project/${project.id}`)}
              onEdit={() => setEditingProject(project)}
              onDelete={() => deleteProject.mutate(project.id)}
            />
          ))}
        </div>
      )}

      <ProjectForm
        open={showNewProjectForm}
        onClose={onCloseNewProjectForm}
        onSubmit={(data) => createProject.mutate(data)}
        isPending={createProject.isPending}
      />

      {editingProject && (
        <ProjectForm
          open={true}
          onClose={() => setEditingProject(null)}
          onSubmit={(data) => updateProject.mutate({ id: editingProject.id, data })}
          project={editingProject}
          isPending={updateProject.isPending}
        />
      )}
    </div>
  );
}
