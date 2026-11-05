"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const popupRef = useRef<HTMLDivElement>(null);
  // The popup is drawn on <body>, positioned from the field, so a modal's
  // scrolling / clipping can't hide it and it always sits above the modal.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const current = parse(value);
  // Until all three parts are chosen nothing is reported to the parent, so the
  // picker keeps the partial choice itself. Each column highlights on its own.
  const [draft, setDraft] = useState<Partial<Parts>>({});
  const sel: Partial<Parts> = current ?? draft;
  const min = minTime ? (() => { const p = parse(minTime); return p ? toMinutes(p) : null; })() : null;
  const blocked = (parts: Parts) => min !== null && toMinutes(parts) <= min;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 208;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      // Open upwards when there is no room below (e.g. a field near the bottom of a modal).
      const flip = window.innerHeight - r.bottom < 230 && r.top > window.innerHeight - r.bottom;
      setPos(flip ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !popupRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Bring the selected hour / minute into view in the scrolling columns.
    popupRef.current?.querySelectorAll('[aria-selected="true"]').forEach((el) => el.scrollIntoView({ block: "nearest" }));
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: Parts) {
    // A change that lands on or before minTime moves to the first allowed minute instead.
    onChange(format(min !== null && toMinutes(next) <= min ? Math.min(min + 1, 24 * 60 - 1) : toMinutes(next)));
  }

  function choose(part: Partial<Parts>) {
    const next = { ...sel, ...part };
    if (next.h !== undefined && next.m !== undefined && next.p !== undefined) {
      setDraft({});
      pick(next as Parts);
    } else {
      setDraft(next);
    }
  }

  // Greyed out only when no choice of the still-unpicked parts could be allowed.
  const hourBlocked = (h: number) =>
    (sel.p ? [sel.p] : PERIODS).every((p) => blocked({ h, m: 59, p }));
  const minuteBlocked = (m: number) =>
    sel.h !== undefined && sel.p !== undefined && blocked({ h: sel.h, m, p: sel.p });
  const periodBlocked = (p: Period) => blocked({ h: 11, m: 59, p });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          // Reopening an empty picker starts from a clean slate.
          if (!open && !current) setDraft({});
          setOpen((o) => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-background border rounded-xl px-4 py-2.5 text-sm text-left outline-none focus:border-primary cursor-pointer ${
          invalid ? "border-red-400" : "border-border"
        }`}
      >
        <span className={current ? "" : "text-muted-foreground"}>{label(current)}</span>
        <Clock size={14} className="flex-shrink-0 text-muted-foreground" />
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label={ariaLabel}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left }}
          className="z-[100] w-52 flex overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <TimeColumns
            sel={sel}
            onChoose={choose}
            hourBlocked={hourBlocked}
            minuteBlocked={minuteBlocked}
            periodBlocked={periodBlocked}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

// Laid out like the browser's own time popup: plain columns, selected value filled in blue.
// Shared by TimePicker and DateTimePicker so both look the same.
export function TimeColumns({
  sel,
  onChoose,
  hourBlocked,
  minuteBlocked,
  periodBlocked,
}: {
  sel: Partial<Parts>;
  onChoose: (part: Partial<Parts>) => void;
  hourBlocked: (h: number) => boolean;
  minuteBlocked: (m: number) => boolean;
  periodBlocked: (p: Period) => boolean;
}) {
  const column = "flex-1 max-h-52 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  const item = (selected: boolean, disabled: boolean) =>
    `w-full px-3 py-1.5 text-sm text-center tabular-nums ${
      disabled ? "opacity-30 cursor-not-allowed" : selected ? "cursor-pointer" : "cursor-pointer hover:bg-secondary"
    } ${selected ? "bg-primary text-white" : ""}`;
  return (
    <>
      <div role="listbox" aria-label="Hour" className={column}>
        {HOURS.map((h) => (
          <button key={h} type="button" role="option" aria-selected={sel.h === h} disabled={hourBlocked(h)} onClick={() => onChoose({ h })} className={item(sel.h === h, hourBlocked(h))}>
            {pad(h)}
          </button>
        ))}
      </div>
      <div role="listbox" aria-label="Minute" className={column}>
        {MINUTES.map((m) => {
          const disabled = minuteBlocked(m);
          return (
            <button key={m} type="button" role="option" aria-selected={sel.m === m} disabled={disabled} onClick={() => onChoose({ m })} className={item(sel.m === m, disabled)}>
              {pad(m)}
            </button>
          );
        })}
      </div>
      <div role="listbox" aria-label="AM or PM" className="w-16 py-1">
        {PERIODS.map((p) => (
          <button key={p} type="button" role="option" aria-selected={sel.p === p} disabled={periodBlocked(p)} onClick={() => onChoose({ p })} className={item(sel.p === p, periodBlocked(p))}>
            {p}
          </button>
        ))}
      </div>
    </>
  );
}
