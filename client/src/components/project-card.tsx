import { FolderOpen, Calendar, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, TestItem } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  testItems: TestItem[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, testItems, onClick, onEdit, onDelete }: ProjectCardProps) {
  const completedTests = testItems.filter((t) => t.progressStatus === "완료").length;
  const totalTests = testItems.length;
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "프로젝트 중단":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all duration-200"
      data-testid={`card-project-${project.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div
          className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-card-foreground truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-project-menu-${project.id}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-${project.id}`}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive"
                data-testid={`button-delete-${project.id}`}
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0" onClick={onClick}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">시험 진행률</span>
              <span className="font-medium text-card-foreground" data-testid={`text-progress-${project.id}`}>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" data-testid={`progress-bar-${project.id}`} />
          </div>

          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span data-testid={`text-period-${project.id}`}>
                {(project.startDate || "—").replace(/-/g, ".")} ~ {(project.endDate || "—").replace(/-/g, ".")}
              </span>
            </div>
          )}

          {project.lastUpdatedAt && (
            <div className="text-xs text-muted-foreground" data-testid={`text-last-updated-${project.id}`}>
              마지막 업데이트: {(project.lastUpdatedAt || "").replace(/-/g, ".")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
