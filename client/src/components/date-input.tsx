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
  return p.length === 3 ? `${p[0]}-${p[1]}-${p[2]}` : iso;
}

function normalizeDisplayValue(value: string): string {
  if (!value) return "";
  const normalized = normalizeAndParse(value);
  return normalized ? isoToDisplay(normalized) : value;
}

function normalizeAndParse(input: string): string | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/\D/g, "");
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  if (digitsOnly.length === 8) {
    year = parseInt(digitsOnly.slice(0, 4), 10);
    month = parseInt(digitsOnly.slice(4, 6), 10);
    day = parseInt(digitsOnly.slice(6, 8), 10);
  } else {
    const parts = cleaned.split(/[^0-9]+/).filter(Boolean);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else if (parts[2].length <= 2) {
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
        year = 2000 + parseInt(parts[2], 10);
      }
    }
  }

  if (year === null || month === null || day === null) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }
  return null;
}

export function DateInput({ value, onChange, disabled, testId, placeholder = "YYYY-MM-DD" }: DateInputProps) {
  const [textValue, setTextValue] = useState(value ? normalizeDisplayValue(value) : "");
  const [error, setError] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue(value ? normalizeDisplayValue(value) : "");
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
