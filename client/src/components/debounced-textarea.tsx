import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DebouncedTextareaProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  rows?: number;
  className?: string;
  "data-testid"?: string;
  debounceMs?: number;
}

export function DebouncedTextarea({
  value,
  onSave,
  placeholder,
  rows = 2,
  className = "",
  "data-testid": testId,
  debounceMs = 800,
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(value);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(value);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (value !== lastSavedRef.current) {
      setLocalValue(value);
      lastSavedRef.current = value;
    }
  }, [value]);

  const doSave = useCallback(async (val: string) => {
    if (val === lastSavedRef.current) return;
    setSaveStatus("saving");
    try {
      await onSave(val);
      lastSavedRef.current = val;
      if (isMountedRef.current) {
        setSaveStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, 2000);
      }
    } catch {
      if (isMountedRef.current) setSaveStatus("error");
    }
  }, [onSave]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave(newVal);
    }, debounceMs);
  }, [doSave, debounceMs]);

  const handleBlur = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== lastSavedRef.current) {
      doSave(localValue);
    }
  }, [localValue, doSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const statusText = saveStatus === "saving" ? "저장 중..." :
                     saveStatus === "saved" ? "저장됨" :
                     saveStatus === "error" ? "저장 실패" : null;

  const statusColor = saveStatus === "saving" ? "text-amber-400" :
                      saveStatus === "saved" ? "text-emerald-400" :
                      saveStatus === "error" ? "text-red-400" : "";

  return (
    <div className="relative">
      <Textarea
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`resize-none ${className}`}
        rows={rows}
        data-testid={testId}
      />
      {statusText && (
        <span className={`absolute bottom-1 right-2 text-[10px] ${statusColor} pointer-events-none`} data-testid={testId ? `${testId}-status` : undefined}>
          {statusText}
        </span>
      )}
    </div>
  );
}
