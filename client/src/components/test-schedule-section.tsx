import { useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TestItem } from "@shared/schema";

interface TestScheduleSectionProps {
    testItems: TestItem[];
    onItemClick: (itemId: string) => void;
    onExportExcel: () => void;
}

export function TestScheduleSection({ testItems, onItemClick, onExportExcel }: TestScheduleSectionProps) {
    const today = startOfDay(new Date());

    // Calculate range based on ALL test items
    const { chartStart, chartEnd, totalDays } = useMemo(() => {
        const dates = testItems
            .flatMap(item => [
                item.plannedStartDate ? parseISO(item.plannedStartDate) : null,
                item.plannedEndDate ? parseISO(item.plannedEndDate) : null
            ])
            .filter((d): d is Date => d !== null);

        let start = startOfWeek(today, { weekStartsOn: 0 });
        let end = addDays(start, 13); // Default 2 weeks

        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

            start = startOfWeek(isBefore(minDate, today) ? minDate : today, { weekStartsOn: 0 });
            end = addDays(startOfWeek(isAfter(maxDate, addDays(start, 13)) ? maxDate : addDays(start, 13), { weekStartsOn: 0 }), 6);
        }

        const diff = Math.max(14, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return { chartStart: start, chartEnd: end, totalDays: diff };
    }, [testItems, today]);

    const sortedItems = useMemo(() => {
        return [...testItems].sort((a, b) => {
            const startA = a.plannedStartDate ? parseISO(a.plannedStartDate).getTime() : 0;
            const startB = b.plannedStartDate ? parseISO(b.plannedStartDate).getTime() : 0;
            return startA - startB;
        });
    }, [testItems]);

    const days = useMemo(() => {
        return Array.from({ length: totalDays }).map((_, i) => addDays(chartStart, i));
    }, [chartStart, totalDays]);

    const getStatusInfo = (item: TestItem) => {
        if (item.progressStatus === "완료") return { color: "bg-emerald-500", label: "완료", shadow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]" };

        if (item.plannedEndDate) {
            const end = parseISO(item.plannedEndDate);
            if (isAfter(today, end) && item.progressStatus !== "완료") {
                return { color: "bg-red-500", label: "일정초과", shadow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]" };
            }
        }

        if (item.plannedStartDate) {
            const start = parseISO(item.plannedStartDate);
            if ((isWithinInterval(today, { start, end: item.plannedEndDate ? parseISO(item.plannedEndDate) : start }) || isAfter(today, start)) &&
                item.progressStatus !== "진행중" && item.progressStatus !== "완료") {
                return { color: "bg-amber-500", label: "지연", shadow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]" };
            }
        }

        if (item.progressStatus === "진행중") return { color: "bg-blue-500", label: "진행중", shadow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]" };

        return { color: "bg-slate-500/50", label: "대기", shadow: "" };
    };

    const calculateBarPosition = (startDateStr: string | null, endDateStr: string | null) => {
        if (!startDateStr) return null;
        const start = parseISO(startDateStr);
        const end = endDateStr ? parseISO(endDateStr) : start;

        // Constrain to the visible window
        const visibleStart = isBefore(start, chartStart) ? chartStart : start;
        const visibleEnd = isAfter(end, chartEnd) ? chartEnd : end;

        if (isAfter(visibleStart, chartEnd) || isBefore(visibleEnd, chartStart)) return null;

        const diffStart = Math.max(0, Math.floor((visibleStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)));
        const diffDays = Math.max(1, Math.floor((visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        return {
            left: `calc((100% / ${totalDays}) * ${diffStart})`,
            width: `calc((100% / ${totalDays}) * ${diffDays})`,
        };
    };

    return (
        <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-[15px] font-semibold flex items-center gap-1.5">
                    시험 계획 <span className="text-[12px] font-normal text-muted-foreground ml-2">(시작일 순)</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={onExportExcel} className="h-8 gap-1.5 border-border">
                    <Download className="w-3.5 h-3.5" />
                    엑셀 내보내기
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-md border bg-muted/20 overflow-auto resize-y min-h-[200px]">
                    <div className="h-full overflow-x-auto">
                        <div className="min-w-[800px] pb-8">
                            {/* Header */}
                            <div className="flex bg-muted/40 border-b">
                                <div className="w-[200px] shrink-0 p-3 text-[12px] font-semibold border-r">시험 항목</div>
                                <div className="flex flex-1">
                                    {days.map((day) => (
                                        <div
                                            key={day.toISOString()}
                                            className={cn(
                                                "flex-1 flex flex-col items-center justify-center py-2 border-r text-[11px] last:border-r-0 min-w-[40px]",
                                                format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") && "bg-blue-500/10 text-blue-400"
                                            )}
                                        >
                                            <span className="opacity-60 text-[9px] mb-0.5">{format(day, "eee", { locale: ko })}</span>
                                            <span>{format(day, "M/d")}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="relative">
                                {sortedItems.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground text-sm">
                                        시험 항목이 없습니다.
                                    </div>
                                ) : (
                                    sortedItems.map((item, index) => {
                                        const statusInfo = getStatusInfo(item);
                                        const position = calculateBarPosition(item.plannedStartDate, item.plannedEndDate);

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex border-b last:border-b-0 hover:bg-muted/10 cursor-pointer group transition-colors"
                                                onClick={() => onItemClick(item.id)}
                                            >
                                                <div className="w-[200px] shrink-0 p-3 border-r flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-muted text-muted-foreground w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-[13px] truncate">{item.name}</span>
                                                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded shrink-0",
                                                        statusInfo.label === "완료" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                            statusInfo.label === "일정초과" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                                                statusInfo.label === "지연" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                                    statusInfo.label === "진행중" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                                                        "bg-muted text-muted-foreground border border-border/50"
                                                    )}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <div className={`flex-1 flex relative h-12 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:calc(100%/${totalDays})_100%]`}>
                                                    {position && (
                                                        <div
                                                            className={cn("absolute h-2.5 rounded-full top-1/2 -translate-y-1/2 z-10", statusInfo.color, statusInfo.shadow)}
                                                            style={{
                                                                left: position.left,
                                                                width: position.width,
                                                            }}
                                                        />
                                                    )}
                                                    {/* Day Columns BG Grid */}
                                                    {days.map((day) => (
                                                        <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 min-w-[40px]" />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Today vertical line */}
                                {days.some(d => format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) && (
                                    <div
                                        className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500 z-20 pointer-events-none"
                                        style={{
                                            left: `calc(200px + (100% - 200px) / ${totalDays} * ${Math.floor((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))} + (100% - 200px) / (${totalDays} * 2))`
                                        }}
                                    >
                                        <div className="absolute bottom-[-22px] left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded font-bold whitespace-nowrap shadow-sm z-30">
                                            Today
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            완료
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            일정초과
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            지연
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            진행중
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            대기
                        </div>
                    </div>
                    <span>* 항목 클릭 시 상세 정보로 이동합니다. | 가로로 스크롤하여 전체 일정을 확인할 수 있습니다.</span>
                </div>
            </CardContent>
        </Card>
    );
}
