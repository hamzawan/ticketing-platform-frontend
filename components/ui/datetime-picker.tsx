"use client";

import { useEffect, useRef, useState } from "react";
import { TimeColumns } from "@/components/ui/time-picker";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";

type Period = "AM" | "PM";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: Period[] = ["AM", "PM"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");
const to24 = (h: number, p: Period) => (h % 12) + (p === "PM" ? 12 : 0);
const stamp = (date: string, h24: number, m: number) => `${date}T${pad(h24)}:${pad(m)}`;
const dayKey = (y: number, mo: number, d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`;

function show(value: string): string {
  const m = DT.exec(value);
  if (!m) return "Select date & time";
  const h = Number(m[4]);
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${day}, ${pad(h % 12 === 0 ? 12 : h % 12)}:${m[5]} ${h >= 12 ? "PM" : "AM"}`;
}

// One field for a date and time ("YYYY-MM-DDTHH:MM"). Its popup holds a month
// calendar plus the same hour / minute / AM-PM columns as TimePicker. Dates and
// times outside min..max (same "YYYY-MM-DDTHH:MM" format, inclusive) are greyed out.
export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  invalid,
  alignRight,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  // On wide screens the popup opens leftwards, for a field in the right-hand column.
  alignRight?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = DT.exec(value);
  const current = parsed
    ? { date: `${parsed[1]}-${parsed[2]}-${parsed[3]}`, h: Number(parsed[4]) % 12 || 12, m: Number(parsed[5]), p: (Number(parsed[4]) >= 12 ? "PM" : "AM") as Period }
    : null;
  // Until date, hour, minute and AM/PM are all chosen nothing is reported to the parent.
  const [draft, setDraft] = useState<{ date?: string; h?: number; m?: number; p?: Period }>({});
  const sel = current ?? draft;
  const [view, setView] = useState(() => {
    const base = parsed ? new Date(Number(parsed[1]), Number(parsed[2]) - 1, 1) : min && DT.test(min) ? new Date(Number(min.slice(0, 4)), Number(min.slice(5, 7)) - 1, 1) : new Date();
    return { y: base.getFullYear(), mo: base.getMonth() };
  });

  const allowed = (at: string) => (!min || at >= min) && (!max || at <= max);
  const dayBlocked = (date: string) => (!!min && stamp(date, 23, 59) < min) || (!!max && stamp(date, 0, 0) > max);
  const timeBlocked = (date: string, h: number, m: number, p: Period) => !allowed(stamp(date, to24(h, p), m));
  // Without a date picked yet, time choices are only greyed out if no date could allow them.
  const date = sel.date;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    rootRef.current?.querySelectorAll('[role="listbox"] [aria-selected="true"]').forEach((el) => el.scrollIntoView({ block: "nearest" }));
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(part: Partial<{ date: string; h: number; m: number; p: Period }>) {
    const next = { ...sel, ...part };
    if (next.date && next.h !== undefined && next.m !== undefined && next.p !== undefined) {
      setDraft({});
      let at = stamp(next.date, to24(next.h, next.p), next.m);
      // A choice outside the allowed range moves to the nearest allowed time.
      if (min && at < min) at = min.slice(0, 10) === next.date ? min : stamp(next.date, 0, 0);
      if (max && at > max) at = max.slice(0, 10) === next.date ? max : stamp(next.date, 23, 59);
      onChange(at);
    } else {
      setDraft(next);
    }
  }

  const hourBlocked = (h: number) =>
    !!date && (sel.p ? [sel.p] : PERIODS).every((p) => MINUTES.every((m) => timeBlocked(date, h, m, p)));
  const minuteBlocked = (m: number) => !!date && sel.h !== undefined && sel.p !== undefined && timeBlocked(date, sel.h, m, sel.p);
  const periodBlocked = (p: Period) => !!date && HOURS.every((h) => MINUTES.every((m) => timeBlocked(date, h, m, p)));

  const first = new Date(view.y, view.mo, 1).getDay();
  const count = new Date(view.y, view.mo + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const monthLabel = new Date(view.y, view.mo, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const step = (by: number) => setView((v) => { const d = new Date(v.y, v.mo + by, 1); return { y: d.getFullYear(), mo: d.getMonth() }; });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          if (!open && !current) setDraft({});
          setOpen((o) => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-background border rounded-xl px-3 py-2.5 text-sm text-left outline-none focus:border-primary cursor-pointer ${
          invalid ? "border-red-400" : "border-border"
        }`}
      >
        <span className={current ? "" : "text-muted-foreground"}>{show(value)}</span>
        <CalendarClock size={14} className="flex-shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div role="dialog" aria-label={ariaLabel} className={`absolute z-40 mt-1.5 inset-x-0 sm:inset-x-auto ${alignRight ? "sm:right-0" : "sm:left-0"} sm:w-[26rem] max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:flex`}>
          <div className="p-3 sm:w-56 sm:flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="p-2 sm:p-1 rounded hover:bg-secondary cursor-pointer"><ChevronLeft size={14} /></button>
              <span className="text-sm font-medium">{monthLabel}</span>
              <button type="button" aria-label="Next month" onClick={() => step(1)} className="p-2 sm:p-1 rounded hover:bg-secondary cursor-pointer"><ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-1">
              {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const key = dayKey(view.y, view.mo, d);
                const disabled = dayBlocked(key);
                const selected = sel.date === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => choose({ date: key })}
                    className={`h-9 sm:h-7 rounded text-sm sm:text-xs tabular-nums ${
                      disabled ? "opacity-30 cursor-not-allowed" : selected ? "bg-primary text-white cursor-pointer" : "hover:bg-secondary cursor-pointer"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex border-t sm:border-t-0 sm:border-l border-border w-full sm:w-52">
            <TimeColumns sel={sel} onChoose={choose} hourBlocked={hourBlocked} minuteBlocked={minuteBlocked} periodBlocked={periodBlocked} />
          </div>
        </div>
      )}
    </div>
  );
}
