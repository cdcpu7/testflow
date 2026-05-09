import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { format, addDays, startOfWeek, isWithinInterval, parseISO, isBefore, isAfter, startOfDay, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TestItem } from "@shared/schema";

interface TestScheduleSectionProps {
    testItems: TestItem[];
    onItemClick: (itemId: string) => void;
    onExportExcel: () => void;
}

// 한국 법정 공휴일 (2026년 기준)
const KOREAN_HOLIDAYS_2026 = [
    "2026-01-01",
    "2026-02-16", "2026-02-17", "2026-02-18",
    "2026-03-01", "2026-03-02",
    "2026-05-05",
    "2026-05-24", "2026-05-25",
    "2026-06-06",
    "2026-08-15", "2026-08-17",
    "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-28",
    "2026-10-03", "2026-10-05",
    "2026-10-09",
    "2026-12-25",
];

const isWeekendOrHoliday = (date: Date) => {
    const day = getDay(date);
    const dateStr = format(date, "yyyy-MM-dd");
    return day === 0 || day === 6 || KOREAN_HOLIDAYS_2026.includes(dateStr);
};

const LABEL_COL_WIDTH = 200;
const MIN_COL_WIDTH = 20;
const MAX_COL_WIDTH = 120;
const DEFAULT_COL_WIDTH = 40;

export function TestScheduleSection({ testItems, onItemClick, onExportExcel }: TestScheduleSectionProps) {
    const today = startOfDay(new Date());
    const [colWidth, setColWidth] = useState(DEFAULT_COL_WIDTH);
    const [sortBy, setSortBy] = useState<"date" | "original">("date");
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(45);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(DEFAULT_COL_WIDTH);

    const { chartStart, chartEnd, totalDays } = useMemo(() => {
        const dates = testItems
            .flatMap(item => [
                item.plannedStartDate ? parseISO(item.plannedStartDate) : null,
                item.plannedEndDate ? parseISO(item.plannedEndDate) : null
            ])
            .filter((d): d is Date => d !== null);

        let start = startOfWeek(today, { weekStartsOn: 0 });
        let end = addDays(start, 13);

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
        if (sortBy === "original") return testItems;
        return [...testItems].sort((a, b) => {
            const startA = a.plannedStartDate ? parseISO(a.plannedStartDate).getTime() : 0;
            const startB = b.plannedStartDate ? parseISO(b.plannedStartDate).getTime() : 0;
            return startA - startB;
        });
    }, [testItems, sortBy]);

    const days = useMemo(() => {
        return Array.from({ length: totalDays }).map((_, i) => addDays(chartStart, i));
    }, [chartStart, totalDays]);

    const todayStr = format(today, "yyyy-MM-dd");

    const todayIndex = useMemo(() => {
        return days.findIndex(d => format(d, "yyyy-MM-dd") === todayStr);
    }, [days, todayStr]);

    // 컬럼 리사이즈 시 오늘 날짜 위치로 자동 스크롤
    const scrollToToday = useCallback(() => {
        if (todayIndex !== -1 && scrollRef.current) {
            const todayLeft = todayIndex * colWidth;
            const containerWidth = scrollRef.current.clientWidth - LABEL_COL_WIDTH;
            const scrollTarget = todayLeft - containerWidth / 2 + colWidth / 2;
            scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
        }
    }, [todayIndex, colWidth]);

    // 마우스 드래그로 열 폭 조절
    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = colWidth;

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = e.clientX - dragStartX.current;
            const newWidth = Math.round(Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, dragStartWidth.current + delta / totalDays)));
            setColWidth(newWidth);
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [colWidth, totalDays]);

    // 초기 로드 및 레이아웃 변경 시 헤더 높이 측정
    useEffect(() => {
        scrollToToday();
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, [colWidth, scrollToToday]);

    const chartWidth = totalDays * colWidth;

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

    const getBarStyle = (startDateStr: string | null, endDateStr: string | null) => {
        if (!startDateStr) return null;
        const start = parseISO(startDateStr);
        const end = endDateStr ? parseISO(endDateStr) : start;

        const startIdx = days.findIndex(d => format(d, "yyyy-MM-dd") === format(start, "yyyy-MM-dd"));
        const endIdx = days.findIndex(d => format(d, "yyyy-MM-dd") === format(end, "yyyy-MM-dd"));

        if (startIdx === -1 && endIdx === -1) {
            if (isAfter(start, chartEnd) || isBefore(end, chartStart)) return null;
        }

        const effectiveStartIdx = startIdx === -1 ? 0 : startIdx;
        const effectiveEndIdx = endIdx === -1 ? totalDays - 1 : endIdx;
        const duration = Math.max(1, effectiveEndIdx - effectiveStartIdx + 1);

        return {
            left: effectiveStartIdx * colWidth,
            width: duration * colWidth,
        };
    };

    return (
        <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-[15px] font-semibold flex items-center gap-1.5">
                    시험 계획 <span className="text-[12px] font-normal text-muted-foreground ml-2">{sortBy === "date" ? "(시작일 순)" : "(항목 순)"}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted rounded-lg p-1 border">
                        <Button
                            variant={sortBy === "date" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-[11px] px-2 shadow-none"
                            onClick={() => setSortBy("date")}
                        >
                            시작일 순
                        </Button>
                        <Button
                            variant={sortBy === "original" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-[11px] px-2 shadow-none"
                            onClick={() => setSortBy("original")}
                        >
                            항목 순
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={onExportExcel} className="h-8 gap-1.5 border-border">
                        <Download className="w-3.5 h-3.5" />
                        엑셀 내보내기
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-md border bg-muted/20 overflow-auto resize-y min-h-[200px]">
                    <div className="flex flex-col h-full">
                        {/* Resize handle bar */}
                        <div className="flex items-center bg-muted/30 border-b px-3 py-1 gap-2">
                            <span className="text-[10px] text-muted-foreground select-none">열 폭:</span>
                            <div
                                className="flex items-center gap-1 cursor-col-resize select-none px-2 py-0.5 rounded bg-muted/40 hover:bg-muted/60 transition-colors"
                                onMouseDown={onResizeStart}
                                title="드래그하여 열 폭 조절"
                            >
                                <GripVertical className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground font-mono">{colWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min={MIN_COL_WIDTH}
                                max={MAX_COL_WIDTH}
                                value={colWidth}
                                onChange={(e) => setColWidth(Number(e.target.value))}
                                className="w-24 h-1 accent-blue-500"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-muted-foreground"
                                onClick={scrollToToday}
                            >
                                오늘로 이동
                            </Button>
                        </div>

                        {/* Scrollable chart area */}
                        <div ref={scrollRef} className="overflow-x-auto relative pb-8">
                            <div style={{ width: LABEL_COL_WIDTH + chartWidth }} className="relative">
                                {/* Today vertical line - 절대 좌표, 전체 차트 관통 */}
                                {todayIndex !== -1 && (
                                    <div
                                        className="absolute bottom-0 w-[2.5px] bg-blue-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                        style={{
                                            left: LABEL_COL_WIDTH + todayIndex * colWidth + colWidth / 2,
                                            top: headerHeight
                                        }}
                                    >
                                        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded font-bold whitespace-nowrap shadow-sm">
                                            Today
                                        </div>
                                    </div>
                                )}

                                {/* Header */}
                                <div ref={headerRef} className="flex bg-muted/40 border-b sticky top-0 z-10">
                                    <div
                                        className="shrink-0 p-3 text-[12px] font-semibold border-r bg-muted/40"
                                        style={{ width: LABEL_COL_WIDTH }}
                                    >
                                        시험 항목
                                    </div>
                                    <div className="flex">
                                        {days.map((day) => {
                                            const dayStr = format(day, "yyyy-MM-dd");
                                            const isToday = dayStr === todayStr;
                                            return (
                                                <div
                                                    key={dayStr}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center py-2 border-r text-[11px] last:border-r-0",
                                                        isToday && "bg-blue-500/10 text-blue-400 font-bold",
                                                        !isToday && isWeekendOrHoliday(day) && "text-red-500"
                                                    )}
                                                    style={{ width: colWidth }}
                                                >
                                                    <span className="opacity-60 text-[9px] mb-0.5">{format(day, "eee", { locale: ko })}</span>
                                                    <span>{format(day, "M/d")}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Rows */}
                                <div>
                                    {sortedItems.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground text-sm">
                                            시험 항목이 없습니다.
                                        </div>
                                    ) : (
                                        sortedItems.map((item, index) => {
                                            const statusInfo = getStatusInfo(item);
                                            const barStyle = getBarStyle(item.plannedStartDate, item.plannedEndDate);

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex border-b last:border-b-0 hover:bg-muted/10 cursor-pointer group transition-colors"
                                                    onClick={() => onItemClick(item.id)}
                                                >
                                                    <div
                                                        className="shrink-0 p-3 border-r flex items-center gap-3 overflow-hidden"
                                                        style={{ width: LABEL_COL_WIDTH }}
                                                    >
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
                                                    {/* Chart area per row */}
                                                    <div className="relative h-12" style={{ width: chartWidth }}>
                                                        {/* Background grid columns */}
                                                        <div className="absolute inset-0 flex">
                                                            {days.map((day) => (
                                                                <div
                                                                    key={day.toISOString()}
                                                                    className={cn(
                                                                        "border-r last:border-r-0 h-full",
                                                                        isWeekendOrHoliday(day) && "bg-red-500/[0.03]"
                                                                    )}
                                                                    style={{ width: colWidth }}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Bar */}
                                                        {barStyle && (
                                                            <div
                                                                className={cn("absolute h-2.5 rounded-full top-1/2 -translate-y-1/2 z-10", statusInfo.color, statusInfo.shadow)}
                                                                style={{
                                                                    left: barStyle.left,
                                                                    width: barStyle.width,
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
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
