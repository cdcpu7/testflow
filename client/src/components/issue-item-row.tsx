import { useState, memo } from "react";
import { ChevronDown, ChevronRight, Calendar, Upload, Trash2, X, BarChart3, Maximize2, AlertTriangle, Paperclip, FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/date-input";
import { DebouncedTextarea } from "@/components/debounced-textarea";
import type { IssueItem, TestItem } from "@shared/schema";

interface IssueItemRowProps {
  item: IssueItem;
  testItems: TestItem[];
  onUpdate: (updates: Partial<IssueItem>) => Promise<any> | void;
  onDelete: () => void;
  onPhotoUpload: (file: File) => void;
  onGraphUpload: (file: File) => void;
  onAttachmentUpload: (file: File) => void;
  onPhotoClick: (url: string) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const IssueItemRow = memo(function IssueItemRow({ item, testItems, onUpdate, onDelete, onPhotoUpload, onGraphUpload, onAttachmentUpload, onPhotoClick }: IssueItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityBadge = () => {
    switch (item.severity) {
      case "High":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">High</Badge>;
      case "Medium":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Medium</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low</Badge>;
    }
  };

  const getProgressBadge = () => {
    switch (item.progressStatus) {
      case "완료":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">완료</Badge>;
      case "진행중":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">진행중</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">대기중</Badge>;
    }
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPhotoUpload(file);
  };

  const handleGraphFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onGraphUpload(file);
  };

  const handleAttachmentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => onAttachmentUpload(file));
    }
    e.target.value = "";
  };

  return (
    <div className="border border-border rounded-md bg-card" data-testid={`issue-item-${item.id}`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button size="icon" variant="ghost" className="shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-card-foreground truncate">{item.name}</h4>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">심각도:</span>
            {getSeverityBadge()}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">진행:</span>
            {getProgressBadge()}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-6 p-3 rounded-md bg-muted/50 flex-wrap">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">최종 수정일</Label>
                <DateInput value={item.lastModifiedDate || ""} onChange={(v) => onUpdate({ lastModifiedDate: v })} testId={`input-issue-last-modified-${item.id}`} />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">심각도</Label>
                <Select value={item.severity} onValueChange={(v) => onUpdate({ severity: v as any })}>
                  <SelectTrigger className="w-28" data-testid={`select-severity-${item.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    1) 일정 관리
                  </h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">발생일</Label>
                      <DateInput value={item.occurredDate || ""} onChange={(v) => onUpdate({ occurredDate: v })} testId={`input-occurred-date-${item.id}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">완료예정일</Label>
                      <DateInput value={item.plannedEndDate || ""} onChange={(v) => onUpdate({ plannedEndDate: v })} testId={`input-issue-end-date-${item.id}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">실제완료일</Label>
                      <DateInput value={item.actualEndDate || ""} onChange={(v) => onUpdate({ actualEndDate: v })} testId={`input-issue-actual-date-${item.id}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">2) 연관 시험 항목</Label>
                  <Select value={item.relatedTestItemId || ""} onValueChange={(v) => onUpdate({ relatedTestItemId: v })}>
                    <SelectTrigger data-testid={`select-related-test-${item.id}`}>
                      <SelectValue placeholder="시험항목 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {testItems.map((ti) => (
                        <SelectItem key={ti.id} value={ti.id}>{ti.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">3) 문제 내용</Label>
                  <DebouncedTextarea placeholder="문제 내용을 입력하세요" value={item.issueContent || ""} onSave={(v) => onUpdate({ issueContent: v })} rows={2} data-testid={`input-issue-content-${item.id}`} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">4) 문제 원인</Label>
                  <DebouncedTextarea placeholder="문제 원인을 입력하세요" value={item.issueCause || ""} onSave={(v) => onUpdate({ issueCause: v })} rows={2} data-testid={`input-issue-cause-${item.id}`} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">5) 문제 대책</Label>
                  <DebouncedTextarea placeholder="문제 대책을 입력하세요" value={item.issueCountermeasure || ""} onSave={(v) => onUpdate({ issueCountermeasure: v })} rows={2} data-testid={`input-issue-countermeasure-${item.id}`} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">6) 대책 검증 결과</Label>
                  <DebouncedTextarea placeholder="대책 검증 결과를 입력하세요" value={item.verificationResult || ""} onSave={(v) => onUpdate({ verificationResult: v })} rows={2} data-testid={`input-verification-result-${item.id}`} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">7) 진행 상태</Label>
                  <Select value={item.progressStatus} onValueChange={(v) => onUpdate({ progressStatus: v as any })}>
                    <SelectTrigger data-testid={`select-issue-progress-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="대기중">대기중</SelectItem>
                      <SelectItem value="진행중">진행중</SelectItem>
                      <SelectItem value="완료">완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">8) 메모</Label>
                  <DebouncedTextarea placeholder="메모를 입력하세요" value={item.notes || ""} onSave={(v) => onUpdate({ notes: v })} rows={2} data-testid={`input-issue-notes-${item.id}`} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    9) 시험 사진
                  </h5>
                  <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                    <input type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" id={`issue-photo-upload-${item.id}`} data-testid={`input-issue-photo-${item.id}`} />
                    <label htmlFor={`issue-photo-upload-${item.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">클릭하여 사진 업로드</span>
                    </label>
                  </div>
                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {item.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(photo)} data-testid={`issue-photo-${item.id}-${idx}`}>
                          <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                          <button
                            className="absolute top-1 right-1 z-10 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("이 이미지를 삭제하시겠습니까?")) {
                                const updated = [...(item.photos || [])];
                                updated.splice(idx, 1);
                                onUpdate({ photos: updated });
                              }
                            }}
                            data-testid={`button-delete-issue-photo-${item.id}-${idx}`}
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    10) 시험 그래프
                  </h5>
                  <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                    <input type="file" accept="image/*" onChange={handleGraphFile} className="hidden" id={`issue-graph-upload-${item.id}`} data-testid={`input-issue-graph-${item.id}`} />
                    <label htmlFor={`issue-graph-upload-${item.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">클릭하여 그래프 업로드</span>
                    </label>
                  </div>
                  {item.graphs && item.graphs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {item.graphs.map((graph, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(graph)} data-testid={`issue-graph-${item.id}-${idx}`}>
                          <img src={graph} alt={`Graph ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                          <button
                            className="absolute top-1 right-1 z-10 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("이 이미지를 삭제하시겠습니까?")) {
                                const updated = [...(item.graphs || [])];
                                updated.splice(idx, 1);
                                onUpdate({ graphs: updated });
                              }
                            }}
                            data-testid={`button-delete-issue-graph-${item.id}-${idx}`}
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    11) 첨부파일
                  </h5>
                  <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                    <input type="file" multiple onChange={handleAttachmentFile} className="hidden" id={`issue-attachment-upload-${item.id}`} data-testid={`input-issue-attachment-${item.id}`} />
                    <label htmlFor={`issue-attachment-upload-${item.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                      <Paperclip className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">클릭하여 파일 첨부 (모든 파일)</span>
                    </label>
                  </div>
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="space-y-1">
                      {item.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group" data-testid={`issue-attachment-${item.id}-${idx}`}>
                          <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.filename}
                            className="flex-1 text-sm text-foreground truncate hover:underline"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`link-issue-attachment-${item.id}-${idx}`}
                          >
                            {att.filename}
                          </a>
                          {att.size && (
                            <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.size)}</span>
                          )}
                          <button
                            className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("이 파일을 삭제하시겠습니까?")) {
                                const updated = [...(item.attachments || [])];
                                updated.splice(idx, 1);
                                onUpdate({ attachments: updated });
                              }
                            }}
                            data-testid={`button-delete-issue-attachment-${item.id}-${idx}`}
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete} data-testid={`button-delete-issue-${item.id}`}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
