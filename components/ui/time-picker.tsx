"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

type Period = "AM" | "PM";
type Parts = { h: number; m: number; p: Period };

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: Period[] = ["AM", "PM"];

const toMinutes = ({ h, m, p }: Parts) => ((h % 12) + (p === "PM" ? 12 : 0)) * 60 + m;
const pad = (n: number) => String(n).padStart(2, "0");

// "HH:MM" (24h) -> parts
function parse(value: string): Parts | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  return { h: hours % 12 === 0 ? 12 : hours % 12, m: Number(match[2]), p: hours >= 12 ? "PM" : "AM" };
}

function format(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Same text the native time input shows: 02:30 PM, or --:-- -- when empty.
function label(parts: Parts | null): string {
  return parts ? `${pad(parts.h)}:${pad(parts.m)} ${parts.p}` : "--:-- --";
}

// Hour / minute / AM-PM picker in the app's style. Times at or before `minTime`
// ("HH:MM") are greyed out and can't be picked — the native <input type="time">
// popup is drawn by the browser and can't disable individual times.
export function TimePicker({
  value,
  onChange,
  minTime,
  invalid,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = parse(value);
  const min = minTime ? (() => { const p = parse(minTime); return p ? toMinutes(p) : null; })() : null;
  const blocked = (parts: Parts) => min !== null && toMinutes(parts) <= min;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Bring the selected hour / minute into view in the scrolling columns.
    rootRef.current?.querySelectorAll('[aria-selected="true"]').forEach((el) => el.scrollIntoView({ block: "nearest" }));
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: Parts) {
    // A change that lands on or before minTime moves to the first allowed minute instead.
    onChange(format(min !== null && toMinutes(next) <= min ? Math.min(min + 1, 24 * 60 - 1) : toMinutes(next)));
  }

  const base: Parts = current ?? { h: 12, m: 0, p: "AM" };
  // An hour is disabled when its last minute is still at or before minTime.
  const hourBlocked = (h: number) => blocked({ h, m: 59, p: base.p });
  const periodBlocked = (p: Period) => blocked({ h: 11, m: 59, p });

  // Laid out like the browser's own time popup: plain columns, selected value filled in blue.
  const column = "flex-1 max-h-52 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  const item = (selected: boolean, disabled: boolean) =>
    `w-full px-3 py-1.5 text-sm text-center tabular-nums ${
      disabled ? "opacity-30 cursor-not-allowed" : selected ? "cursor-pointer" : "cursor-pointer hover:bg-secondary"
    } ${selected ? "bg-primary text-white" : ""}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-background border rounded-xl px-4 py-2.5 text-sm text-left outline-none focus:border-primary cursor-pointer ${
          invalid ? "border-red-400" : "border-border"
        }`}
      >
        <span className={current ? "" : "text-muted-foreground"}>{label(current)}</span>
        <Clock size={14} className="flex-shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div role="dialog" aria-label={ariaLabel} className="absolute z-40 mt-1.5 w-52 max-w-[calc(100vw-2rem)] flex overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div role="listbox" aria-label="Hour" className={column}>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                role="option"
                aria-selected={current?.h === h}
                disabled={hourBlocked(h)}
                onClick={() => pick({ ...base, h })}
                className={item(current?.h === h, hourBlocked(h))}
              >
                {pad(h)}
              </button>
            ))}
          </div>
          <div role="listbox" aria-label="Minute" className={column}>
            {MINUTES.map((m) => {
              const disabled = blocked({ ...base, m });
              return (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={current?.m === m}
                  disabled={disabled}
                  onClick={() => pick({ ...base, m })}
                  className={item(current?.m === m, disabled)}
                >
                  {pad(m)}
                </button>
              );
            })}
          </div>
          <div role="listbox" aria-label="AM or PM" className="w-16 py-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={current?.p === p}
                disabled={periodBlocked(p)}
                onClick={() => pick({ ...base, p })}
                className={item(current?.p === p, periodBlocked(p))}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
