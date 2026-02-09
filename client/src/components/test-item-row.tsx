import { useState } from "react";
import { ChevronDown, ChevronRight, Calendar, Upload, Trash2, Edit2, FlaskConical, BarChart3, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TestItem } from "@shared/schema";

function DateInput({ value, onChange, disabled, testId }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const [textValue, setTextValue] = useState(value ? formatDisplay(value) : "");

  function formatDisplay(iso: string): string {
    if (!iso) return "";
    const p = iso.split("-");
    return p.length === 3 ? `${p[0]}.${p[1]}.${p[2]}` : iso;
  }

  function parseToISO(input: string): string {
    const cleaned = input.replace(/[^\d.]/g, "");
    const p = cleaned.split(".");
    if (p.length === 3 && p[0].length === 4 && p[1].length === 2 && p[2].length === 2) {
      return `${p[0]}-${p[1]}-${p[2]}`;
    }
    return "";
  }

  return (
    <div className="flex gap-1">
      <Input
        type="text"
        placeholder="YYYY.MM.DD"
        value={textValue}
        onChange={(e) => {
          setTextValue(e.target.value);
          const iso = parseToISO(e.target.value);
          if (iso) onChange(iso);
        }}
        disabled={disabled}
        className="flex-1"
        data-testid={testId ? `${testId}-text` : undefined}
      />
      <Input
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTextValue(formatDisplay(e.target.value));
        }}
        disabled={disabled}
        className="w-10 px-1"
        data-testid={testId}
      />
    </div>
  );
}

interface TestItemRowProps {
  item: TestItem;
  onUpdate: (updates: Partial<TestItem>) => void;
  onDelete: () => void;
  onPhotoUpload: (file: File) => void;
  onGraphUpload: (file: File) => void;
  onPhotoClick: (url: string) => void;
}

export function TestItemRow({ item, onUpdate, onDelete, onPhotoUpload, onGraphUpload, onPhotoClick }: TestItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getResultBadge = () => {
    switch (item.testResult) {
      case "OK":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">OK</Badge>;
      case "NG":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">NG</Badge>;
      case "TBD":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">TBD</Badge>;
      default:
        return <span className="text-muted-foreground text-xs">-</span>;
    }
  };

  const getReportBadge = () => {
    switch (item.reportStatus) {
      case "완료":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">완료</Badge>;
      case "작성중":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">작성중</Badge>;
      default:
        return <span className="text-muted-foreground text-xs">대기중</span>;
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

  return (
    <div className="border border-border rounded-md bg-card" data-testid={`test-item-${item.id}`}>
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
            <span className="text-muted-foreground">진행:</span>
            {getProgressBadge()}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">결과:</span>
            {getResultBadge()}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">보고서:</span>
            {getReportBadge()}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">최종 수정일</Label>
              <DateInput
                value={item.lastModifiedDate || ""}
                onChange={(v) => onUpdate({ lastModifiedDate: v })}
                testId={`input-last-modified-${item.id}`}
              />
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
                      <Label className="text-xs text-muted-foreground">시작일</Label>
                      <DateInput value={item.plannedStartDate || ""} onChange={(v) => onUpdate({ plannedStartDate: v })} testId={`input-start-date-${item.id}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">완료예정일</Label>
                      <DateInput value={item.plannedEndDate || ""} onChange={(v) => onUpdate({ plannedEndDate: v })} testId={`input-end-date-${item.id}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">실제완료일</Label>
                      <DateInput value={item.actualEndDate || ""} onChange={(v) => onUpdate({ actualEndDate: v })} testId={`input-actual-date-${item.id}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">2) 시험 조건</Label>
                  <Textarea
                    placeholder="시험 조건을 입력하세요"
                    value={item.testCondition || ""}
                    onChange={(e) => onUpdate({ testCondition: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-test-condition-${item.id}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">3) 판정 기준</Label>
                  <Textarea
                    placeholder="판정 기준을 입력하세요"
                    value={item.judgmentCriteria || ""}
                    onChange={(e) => onUpdate({ judgmentCriteria: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-judgment-criteria-${item.id}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">4) 시험 데이터</Label>
                  <Textarea
                    placeholder="시험 데이터를 입력하세요"
                    value={item.testData || ""}
                    onChange={(e) => onUpdate({ testData: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-test-data-${item.id}`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">5) 시험 결과</Label>
                    <Select value={item.testResult || ""} onValueChange={(v) => onUpdate({ testResult: v as any })}>
                      <SelectTrigger data-testid={`select-test-result-${item.id}`}>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OK">OK</SelectItem>
                        <SelectItem value="NG">NG</SelectItem>
                        <SelectItem value="TBD">TBD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">6) 진행 상태</Label>
                    <Select value={item.progressStatus} onValueChange={(v) => onUpdate({ progressStatus: v as any })}>
                      <SelectTrigger data-testid={`select-progress-${item.id}`}>
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
                    <Label className="text-sm font-medium">7) 보고서</Label>
                    <Select value={item.reportStatus} onValueChange={(v) => onUpdate({ reportStatus: v as any })}>
                      <SelectTrigger data-testid={`select-report-${item.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="대기중">대기중</SelectItem>
                        <SelectItem value="작성중">작성중</SelectItem>
                        <SelectItem value="완료">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">8) 메모</Label>
                  <Textarea
                    placeholder="메모를 입력하세요"
                    value={item.notes || ""}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-notes-${item.id}`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    9) 시험 사진
                  </h5>
                  <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                    <input type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" id={`photo-upload-${item.id}`} data-testid={`input-photo-${item.id}`} />
                    <label htmlFor={`photo-upload-${item.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">클릭하여 사진 업로드</span>
                    </label>
                  </div>
                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {item.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(photo)} data-testid={`photo-${item.id}-${idx}`}>
                          <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
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
                    <input type="file" accept="image/*" onChange={handleGraphFile} className="hidden" id={`graph-upload-${item.id}`} data-testid={`input-graph-${item.id}`} />
                    <label htmlFor={`graph-upload-${item.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">클릭하여 그래프 업로드</span>
                    </label>
                  </div>
                  {item.graphs && item.graphs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {item.graphs.map((graph, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden cursor-pointer group" onClick={() => onPhotoClick(graph)} data-testid={`graph-${item.id}-${idx}`}>
                          <img src={graph} alt={`Graph ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete} data-testid={`button-delete-item-${item.id}`}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
