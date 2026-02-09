import { useState, useRef, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testId?: string;
  placeholder?: string;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[0]}.${p[1]}.${p[2]}` : iso;
}

function normalizeAndParse(input: string): string | null {
  const cleaned = input.replace(/[\-\/]/g, ".").replace(/[^\d.]/g, "");
  const p = cleaned.split(".");
  if (p.length === 3 && p[0].length === 4 && p[1].length <= 2 && p[2].length <= 2) {
    const year = parseInt(p[0], 10);
    const month = parseInt(p[1], 10);
    const day = parseInt(p[2], 10);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
      }
    }
  }
  return null;
}

export function DateInput({ value, onChange, disabled, testId, placeholder = "YYYY.MM.DD" }: DateInputProps) {
  const [textValue, setTextValue] = useState(value ? isoToDisplay(value) : "");
  const [error, setError] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue(value ? isoToDisplay(value) : "");
    setError("");
  }, [value]);

  function handleBlurOrEnter() {
    if (!textValue.trim()) {
      if (value) onChange("");
      setError("");
      return;
    }
    const iso = normalizeAndParse(textValue);
    if (iso) {
      setError("");
      if (iso !== value) onChange(iso);
      setTextValue(isoToDisplay(iso));
    } else {
      setError("날짜 형식이 올바르지 않습니다");
      setTextValue(value ? isoToDisplay(value) : "");
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      onChange(iso);
      setTextValue(isoToDisplay(iso));
      setError("");
    }
    setCalendarOpen(false);
  }

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className="space-y-1">
      <div className="flex gap-1 items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={textValue}
          onChange={(e) => {
            setTextValue(e.target.value);
            setError("");
          }}
          onBlur={handleBlurOrEnter}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleBlurOrEnter();
            }
          }}
          disabled={disabled}
          className="flex-1"
          data-testid={testId ? `${testId}-text` : undefined}
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={disabled}
              type="button"
              data-testid={testId ? `${testId}-calendar` : undefined}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              defaultMonth={selectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p className="text-xs text-destructive" data-testid={testId ? `${testId}-error` : undefined}>{error}</p>
      )}
    </div>
  );
}
