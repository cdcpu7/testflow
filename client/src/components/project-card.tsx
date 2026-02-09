import { FolderOpen, Calendar, CheckCircle2, Clock, MoreVertical, FileText } from "lucide-react";
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
  const reportsCompleted = testItems.filter((t) => t.reportStatus === "완료").length;

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
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{project.startDate}</span>
                {project.endDate && <span>~ {project.endDate}</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-card-foreground">{totalTests}</div>
              <div className="text-xs text-muted-foreground">전체 항목</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-emerald-400">{completedTests}</div>
              <div className="text-xs text-muted-foreground">시험 완료</div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-blue-400">{reportsCompleted}</div>
              <div className="text-xs text-muted-foreground">보고서 완료</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-medium text-card-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
