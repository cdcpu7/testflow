import { useState } from "react";
import { ChevronDown, ChevronRight, Calendar, CheckCircle2, FileText, Upload, Trash2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TestItem } from "@shared/schema";

interface TestItemRowProps {
  item: TestItem;
  onUpdate: (updates: Partial<TestItem>) => void;
  onDelete: () => void;
  onPhotoUpload: (file: File) => void;
  onPhotoClick: (url: string) => void;
}

export function TestItemRow({ item, onUpdate, onDelete, onPhotoUpload, onPhotoClick }: TestItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getStatusBadge = () => {
    if (item.testCompleted && item.reportCompleted) {
      return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">완료</Badge>;
    }
    if (item.testCompleted) {
      return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">시험완료</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground">대기중</Badge>;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoUpload(file);
    }
  };

  return (
    <div className="border border-border rounded-md bg-card" data-testid={`test-item-${item.id}`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button size="icon" variant="ghost" className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-card-foreground truncate">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {item.plannedStartDate && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{item.plannedStartDate}</span>
              {item.plannedEndDate && <span>~ {item.plannedEndDate}</span>}
            </div>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  일정 관리
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">시작일</Label>
                    <Input
                      type="date"
                      value={item.plannedStartDate || ""}
                      onChange={(e) => onUpdate({ plannedStartDate: e.target.value })}
                      disabled={!isEditing}
                      data-testid={`input-start-date-${item.id}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">완료예정일</Label>
                    <Input
                      type="date"
                      value={item.plannedEndDate || ""}
                      onChange={(e) => onUpdate({ plannedEndDate: e.target.value })}
                      disabled={!isEditing}
                      data-testid={`input-end-date-${item.id}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">실제완료일</Label>
                    <Input
                      type="date"
                      value={item.actualEndDate || ""}
                      onChange={(e) => onUpdate({ actualEndDate: e.target.value })}
                      disabled={!isEditing}
                      data-testid={`input-actual-date-${item.id}`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  상태
                </h5>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <Label className="text-sm">시험 완료</Label>
                    <Switch
                      checked={item.testCompleted}
                      onCheckedChange={(checked) => onUpdate({ testCompleted: checked })}
                      data-testid={`switch-test-${item.id}`}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <Label className="text-sm">보고서 완료</Label>
                    <Switch
                      checked={item.reportCompleted}
                      onCheckedChange={(checked) => onUpdate({ reportCompleted: checked })}
                      data-testid={`switch-report-${item.id}`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  데이터
                </h5>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">수치 데이터</Label>
                  <Textarea
                    placeholder="측정값, 결과 등 수치 데이터를 입력하세요"
                    value={item.numericData || ""}
                    onChange={(e) => onUpdate({ numericData: e.target.value })}
                    disabled={!isEditing}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-numeric-${item.id}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">메모</Label>
                  <Textarea
                    placeholder="메모를 입력하세요"
                    value={item.notes || ""}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    disabled={!isEditing}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-notes-${item.id}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  사진 및 파일
                </h5>
                <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id={`file-upload-${item.id}`}
                    data-testid={`input-file-${item.id}`}
                  />
                  <label
                    htmlFor={`file-upload-${item.id}`}
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      클릭하여 사진 업로드
                    </span>
                  </label>
                </div>

                {item.photos && item.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {item.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-md overflow-hidden cursor-pointer group"
                        onClick={() => onPhotoClick(photo)}
                        data-testid={`photo-${item.id}-${idx}`}
                      >
                        <img
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white">클릭하여 확대</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              data-testid={`button-edit-item-${item.id}`}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              {isEditing ? "저장" : "수정"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={onDelete}
              data-testid={`button-delete-item-${item.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
