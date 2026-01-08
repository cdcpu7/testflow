import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Calendar,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Upload,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { TestItemRow } from "@/components/test-item-row";
import { TestItemForm } from "@/components/test-item-form";
import { ImageModal } from "@/components/image-modal";
import { SpecViewer } from "@/components/spec-viewer";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, TestItem, InsertTestItem } from "@shared/schema";

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [, setLocation] = useLocation();
  const [showTestItemForm, setShowTestItemForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [specViewerOpen, setSpecViewerOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: testItems = [], isLoading: itemsLoading } = useQuery<TestItem[]>({
    queryKey: ["/api/projects", projectId, "test-items"],
  });

  const createTestItem = useMutation({
    mutationFn: async (data: Omit<InsertTestItem, "projectId">) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/test-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-items"] });
      setShowTestItemForm(false);
      toast({ title: "시험항목이 추가되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateTestItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TestItem> }) => {
      const res = await apiRequest("PATCH", `/api/test-items/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-items"] });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteTestItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/test-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-items"] });
      toast({ title: "시험항목이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/test-items/${itemId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
      toast({ title: "사진이 업로드되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateProjectImage = useMutation({
    mutationFn: async ({ type, file }: { type: "product" | "schedule"; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch(`/api/projects/${projectId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "이미지가 업로드되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateProject = useMutation({
    mutationFn: async (updates: { description?: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditingDescription(false);
      toast({ title: "설명이 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const handleStartEditDescription = () => {
    setEditedDescription(project?.description || "");
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    updateProject.mutate({ description: editedDescription });
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription("");
  };

  if (projectLoading || itemsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => setLocation("/")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const completedTests = testItems.filter((t) => t.testCompleted).length;
  const totalTests = testItems.length;
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  const reportsCompleted = testItems.filter((t) => t.reportCompleted).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "보류":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const handleImageUpload = (type: "product" | "schedule") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        updateProjectImage.mutate({ type, file });
      }
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isEditingDescription ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="프로젝트 설명을 입력하세요"
                    className="flex-1"
                    data-testid="input-edit-description"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveDescription();
                      if (e.key === "Escape") handleCancelEditDescription();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveDescription}
                    disabled={updateProject.isPending}
                    data-testid="button-save-description"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEditDescription}
                    data-testid="button-cancel-description"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={handleStartEditDescription}
                  data-testid="button-edit-description"
                >
                  <p className="text-muted-foreground">
                    {project.description || "설명 추가..."}
                  </p>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setShowTestItemForm(true)} data-testid="button-add-test-item">
          <Plus className="w-4 h-4 mr-2" />
          시험항목 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-lg font-medium">프로젝트 현황</CardTitle>
            {project.startDate && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{project.startDate}</span>
                {project.endDate && <span>~ {project.endDate}</span>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-semibold">{totalTests}</div>
                <div className="text-xs text-muted-foreground">전체 항목</div>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-semibold text-emerald-400">{completedTests}</div>
                <div className="text-xs text-muted-foreground">시험 완료</div>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-semibold text-blue-400">{reportsCompleted}</div>
                <div className="text-xs text-muted-foreground">보고서 완료</div>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/50">
                <div className="text-2xl font-semibold text-amber-400">
                  {totalTests - completedTests}
                </div>
                <div className="text-xs text-muted-foreground">대기중</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">전체 진행률</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">첨부 자료</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  제품 이미지
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleImageUpload("product")}
                  data-testid="button-upload-product-image"
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
              {project.productImage ? (
                <div
                  className="relative aspect-video rounded-md overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedImage(project.productImage!)}
                  data-testid="image-product"
                >
                  <img
                    src={project.productImage}
                    alt="제품 이미지"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div
                  className="aspect-video rounded-md bg-muted/50 flex items-center justify-center cursor-pointer hover-elevate"
                  onClick={() => handleImageUpload("product")}
                >
                  <span className="text-xs text-muted-foreground">클릭하여 업로드</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  일정표
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleImageUpload("schedule")}
                  data-testid="button-upload-schedule-image"
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
              {project.scheduleImage ? (
                <div
                  className="relative aspect-video rounded-md overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedImage(project.scheduleImage!)}
                  data-testid="image-schedule"
                >
                  <img
                    src={project.scheduleImage}
                    alt="일정표"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div
                  className="aspect-video rounded-md bg-muted/50 flex items-center justify-center cursor-pointer hover-elevate"
                  onClick={() => handleImageUpload("schedule")}
                >
                  <span className="text-xs text-muted-foreground">클릭하여 업로드</span>
                </div>
              )}
            </div>

            {project.productSpec && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  제품 사양
                </span>
                <div
                  className="p-3 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                  onClick={() => setSpecViewerOpen(true)}
                  data-testid="button-view-spec"
                >
                  <p className="text-sm line-clamp-3">{project.productSpec}</p>
                  <span className="text-xs text-primary mt-2 block">클릭하여 전체 보기</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">시험항목 ({testItems.length})</h2>
        {testItems.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">시험항목이 없습니다.</p>
            <Button onClick={() => setShowTestItemForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              시험항목 추가
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {testItems.map((item) => (
              <TestItemRow
                key={item.id}
                item={item}
                onUpdate={(updates) =>
                  updateTestItem.mutate({ id: item.id, updates })
                }
                onDelete={() => deleteTestItem.mutate(item.id)}
                onPhotoUpload={(file) =>
                  uploadPhoto.mutate({ itemId: item.id, file })
                }
                onPhotoClick={(url) => setSelectedImage(url)}
              />
            ))}
          </div>
        )}
      </div>

      <TestItemForm
        open={showTestItemForm}
        onClose={() => setShowTestItemForm(false)}
        onSubmit={(data) => createTestItem.mutate(data)}
        isPending={createTestItem.isPending}
      />

      {selectedImage && (
        <ImageModal
          open={true}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage}
        />
      )}

      {project.productSpec && (
        <SpecViewer
          open={specViewerOpen}
          onClose={() => setSpecViewerOpen(false)}
          title="제품 사양"
          content={project.productSpec}
          type="spec"
        />
      )}
    </div>
  );
}
