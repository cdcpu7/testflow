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
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestItemRow } from "@/components/test-item-row";
import { IssueItemRow } from "@/components/issue-item-row";
import { TestItemForm } from "@/components/test-item-form";
import { IssueItemForm } from "@/components/issue-item-form";
import { ImageModal } from "@/components/image-modal";
import { SpecViewer } from "@/components/spec-viewer";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, TestItem, IssueItem } from "@shared/schema";

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [, setLocation] = useLocation();
  const [showTestItemForm, setShowTestItemForm] = useState(false);
  const [showIssueItemForm, setShowIssueItemForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [specViewerOpen, setSpecViewerOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isEditingScheduleDesc, setIsEditingScheduleDesc] = useState(false);
  const [editedScheduleDesc, setEditedScheduleDesc] = useState("");
  const [isEditingProductSpecDesc, setIsEditingProductSpecDesc] = useState(false);
  const [editedProductSpecDesc, setEditedProductSpecDesc] = useState("");
  const [resultFilter, setResultFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: testItems = [], isLoading: itemsLoading } = useQuery<TestItem[]>({
    queryKey: ["/api/projects", projectId, "test-items"],
  });

  const { data: issueItems = [], isLoading: issuesLoading } = useQuery<IssueItem[]>({
    queryKey: ["/api/projects", projectId, "issue-items"],
  });

  // Test Items mutations
  const createTestItem = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/test-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
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
      toast({ title: "시험항목이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const uploadTestPhoto = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/test-items/${itemId}/photos`, { method: "POST", body: formData, credentials: "include" });
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

  const uploadTestGraph = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/test-items/${itemId}/graphs`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "test-items"] });
      toast({ title: "그래프가 업로드되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  // Issue Items mutations
  const createIssueItem = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/issue-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issue-items"] });
      setShowIssueItemForm(false);
      toast({ title: "문제항목이 추가되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateIssueItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IssueItem> }) => {
      const res = await apiRequest("PATCH", `/api/issue-items/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issue-items"] });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteIssueItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/issue-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issue-items"] });
      toast({ title: "문제항목이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const uploadIssuePhoto = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/issue-items/${itemId}/photos`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issue-items"] });
      toast({ title: "사진이 업로드되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const uploadIssueGraph = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/issue-items/${itemId}/graphs`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issue-items"] });
      toast({ title: "그래프가 업로드되었습니다." });
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
      const res = await fetch(`/api/projects/${projectId}/images`, { method: "POST", body: formData, credentials: "include" });
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
    mutationFn: async (updates: { description?: string; scheduleDescription?: string; productSpecDescription?: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditingDescription(false);
      setIsEditingScheduleDesc(false);
      setIsEditingProductSpecDesc(false);
      toast({ title: "수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  if (projectLoading || itemsLoading || issuesLoading) {
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

  // Stats calculations
  const totalTests = testItems.length;
  const completedTests = testItems.filter((t) => t.progressStatus === "완료").length;
  const okCount = testItems.filter((t) => t.testResult === "OK").length;
  const ngCount = testItems.filter((t) => t.testResult === "NG").length;
  const tbdCount = testItems.filter((t) => t.testResult === "TBD").length;
  const reportsCompleted = testItems.filter((t) => t.reportStatus === "완료").length;
  const totalIssues = issueItems.length;
  const completedIssues = issueItems.filter((i) => i.progressStatus === "완료").length;
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  const filteredTestItems = resultFilter
    ? testItems.filter((t) => t.testResult === resultFilter)
    : testItems;

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
      if (file) updateProjectImage.mutate({ type, file });
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
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
                      if (e.key === "Enter") updateProject.mutate({ description: editedDescription });
                      if (e.key === "Escape") setIsEditingDescription(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => updateProject.mutate({ description: editedDescription })} disabled={updateProject.isPending} data-testid="button-save-description">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingDescription(false)} data-testid="button-cancel-description">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setEditedDescription(project.description || ""); setIsEditingDescription(true); }} data-testid="button-edit-description">
                  <p className="text-muted-foreground">{project.description || "설명 추가..."}</p>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary & Attachments */}
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
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-6 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">시험 진행:</span>
                  <span className="font-medium">완료 {completedTests} / 전체 {totalTests}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">시험 결과:</span>
                  <span className="font-medium text-emerald-400">OK {okCount}</span>
                  <span>/</span>
                  <span
                    className={`font-medium cursor-pointer ${ngCount > 0 ? "text-red-400" : "text-muted-foreground"}`}
                    onClick={() => setResultFilter(resultFilter === "NG" ? null : "NG")}
                    data-testid="filter-ng"
                  >
                    NG {ngCount}
                  </span>
                  <span>/</span>
                  <span
                    className={`font-medium cursor-pointer ${tbdCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}
                    onClick={() => setResultFilter(resultFilter === "TBD" ? null : "TBD")}
                    data-testid="filter-tbd"
                  >
                    TBD {tbdCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">보고서:</span>
                  <span className="font-medium">완료 {reportsCompleted} / 전체 {totalTests}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">문제:</span>
                  <span className="font-medium">완료 {completedIssues} / 전체 {totalIssues}</span>
                </div>
              </div>
              {resultFilter && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {resultFilter} 필터 적용중
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => setResultFilter(null)} data-testid="button-clear-filter">
                    <X className="w-3.5 h-3.5 mr-1" />
                    해제
                  </Button>
                </div>
              )}
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  1. 일정
                </span>
                <Button size="sm" variant="ghost" onClick={() => handleImageUpload("schedule")} data-testid="button-upload-schedule-image">
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {isEditingScheduleDesc ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input value={editedScheduleDesc} onChange={(e) => setEditedScheduleDesc(e.target.value)} placeholder="일정 설명 입력" className="flex-1 text-sm" data-testid="input-schedule-description" autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateProject.mutate({ scheduleDescription: editedScheduleDesc }); if (e.key === "Escape") setIsEditingScheduleDesc(false); }} />
                    <Button size="icon" variant="ghost" onClick={() => updateProject.mutate({ scheduleDescription: editedScheduleDesc })} disabled={updateProject.isPending} data-testid="button-save-schedule-desc"><Check className="w-4 h-4 text-emerald-400" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingScheduleDesc(false)} data-testid="button-cancel-schedule-desc"><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer group flex-1" onClick={() => { setEditedScheduleDesc(project.scheduleDescription || ""); setIsEditingScheduleDesc(true); }} data-testid="button-edit-schedule-desc">
                    <p className="text-sm text-muted-foreground truncate">{project.scheduleDescription || "설명 추가..."}</p>
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                )}
              </div>
              {project.scheduleImage ? (
                <div className="relative aspect-video rounded-md overflow-hidden cursor-pointer group" onClick={() => setSelectedImage(project.scheduleImage!)} data-testid="image-schedule">
                  <img src={project.scheduleImage} alt="일정" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-md bg-muted/50 flex items-center justify-center cursor-pointer hover-elevate" onClick={() => handleImageUpload("schedule")}>
                  <span className="text-xs text-muted-foreground">클릭하여 업로드</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  2. 제품사양
                </span>
                <Button size="sm" variant="ghost" onClick={() => handleImageUpload("product")} data-testid="button-upload-product-image">
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {isEditingProductSpecDesc ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input value={editedProductSpecDesc} onChange={(e) => setEditedProductSpecDesc(e.target.value)} placeholder="제품사양 설명 입력" className="flex-1 text-sm" data-testid="input-product-spec-description" autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateProject.mutate({ productSpecDescription: editedProductSpecDesc }); if (e.key === "Escape") setIsEditingProductSpecDesc(false); }} />
                    <Button size="icon" variant="ghost" onClick={() => updateProject.mutate({ productSpecDescription: editedProductSpecDesc })} disabled={updateProject.isPending} data-testid="button-save-product-spec-desc"><Check className="w-4 h-4 text-emerald-400" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingProductSpecDesc(false)} data-testid="button-cancel-product-spec-desc"><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer group flex-1" onClick={() => { setEditedProductSpecDesc(project.productSpecDescription || ""); setIsEditingProductSpecDesc(true); }} data-testid="button-edit-product-spec-desc">
                    <p className="text-sm text-muted-foreground truncate">{project.productSpecDescription || "설명 추가..."}</p>
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                )}
              </div>
              {project.productImage ? (
                <div className="relative aspect-video rounded-md overflow-hidden cursor-pointer group" onClick={() => setSelectedImage(project.productImage!)} data-testid="image-product">
                  <img src={project.productImage} alt="제품사양" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-md bg-muted/50 flex items-center justify-center cursor-pointer hover-elevate" onClick={() => handleImageUpload("product")}>
                  <span className="text-xs text-muted-foreground">클릭하여 업로드</span>
                </div>
              )}
            </div>

            {project.productSpec && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  제품 사양 텍스트
                </span>
                <div className="p-3 rounded-md bg-muted/50 cursor-pointer hover-elevate" onClick={() => setSpecViewerOpen(true)} data-testid="button-view-spec">
                  <p className="text-sm line-clamp-3">{project.productSpec}</p>
                  <span className="text-xs text-primary mt-2 block">클릭하여 전체 보기</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Test Items and Issue Items */}
      <Tabs defaultValue="test-items">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="test-items" data-testid="tab-test-items">
              <FlaskIcon className="w-4 h-4 mr-1.5" />
              시험항목 ({testItems.length})
            </TabsTrigger>
            <TabsTrigger value="issue-items" data-testid="tab-issue-items">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              문제항목 ({issueItems.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="test-items" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTestItemForm(true)} data-testid="button-add-test-item">
              <Plus className="w-4 h-4 mr-2" />
              시험항목추가
            </Button>
          </div>
          {filteredTestItems.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                {resultFilter ? `${resultFilter} 결과에 해당하는 시험항목이 없습니다.` : "시험항목이 없습니다."}
              </p>
              {!resultFilter && (
                <Button onClick={() => setShowTestItemForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  시험항목 추가
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTestItems.map((item) => (
                <TestItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateTestItem.mutate({ id: item.id, updates })}
                  onDelete={() => deleteTestItem.mutate(item.id)}
                  onPhotoUpload={(file) => uploadTestPhoto.mutate({ itemId: item.id, file })}
                  onGraphUpload={(file) => uploadTestGraph.mutate({ itemId: item.id, file })}
                  onPhotoClick={(url) => setSelectedImage(url)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="issue-items" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowIssueItemForm(true)} data-testid="button-add-issue-item">
              <Plus className="w-4 h-4 mr-2" />
              문제항목추가
            </Button>
          </div>
          {issueItems.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">문제항목이 없습니다.</p>
              <Button onClick={() => setShowIssueItemForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                문제항목 추가
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {issueItems.map((item) => (
                <IssueItemRow
                  key={item.id}
                  item={item}
                  testItems={testItems}
                  onUpdate={(updates) => updateIssueItem.mutate({ id: item.id, updates })}
                  onDelete={() => deleteIssueItem.mutate(item.id)}
                  onPhotoUpload={(file) => uploadIssuePhoto.mutate({ itemId: item.id, file })}
                  onGraphUpload={(file) => uploadIssueGraph.mutate({ itemId: item.id, file })}
                  onPhotoClick={(url) => setSelectedImage(url)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TestItemForm
        open={showTestItemForm}
        onClose={() => setShowTestItemForm(false)}
        onSubmit={(data) => createTestItem.mutate(data)}
        isPending={createTestItem.isPending}
      />

      <IssueItemForm
        open={showIssueItemForm}
        onClose={() => setShowIssueItemForm(false)}
        onSubmit={(data) => createIssueItem.mutate(data)}
        isPending={createIssueItem.isPending}
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

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" />
      <path d="M7.5 21h9" /><path d="M5.7 18.3 10 9h4l4.3 9.3" />
      <path d="M6 21a1 1 0 0 0 1.4.3l.3-.3" /><path d="M18 21a1 1 0 0 1-1.4.3l-.3-.3" />
    </svg>
  );
}
