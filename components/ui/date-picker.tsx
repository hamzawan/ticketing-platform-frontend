"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, mo: number, d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`;
// Local date (not UTC), so "Today" is right late in the evening too.
const todayKey = () => {
  const n = new Date();
  return dayKey(n.getFullYear(), n.getMonth(), n.getDate());
};

function show(value: string, placeholder: string): string {
  const m = ISO.exec(value);
  if (!m) return placeholder;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// A date field ("YYYY-MM-DD") whose popup is a month calendar with Today and Clear.
// The native <input type="date"> popup is drawn by the browser: iOS and Android have
// no Today/Clear there and a page can't add them, hence this component.
// On phones the calendar opens as a centred modal; from `sm` up it sits under the field.
// Dates outside min..max (same format, inclusive) are greyed out.
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Drawn on <body> so a scrolling or clipping parent can't hide it.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const parsed = ISO.exec(value);
  const [view, setView] = useState(() => {
    const base = parsed ? new Date(Number(parsed[1]), Number(parsed[2]) - 1, 1) : new Date();
    return { y: base.getFullYear(), mo: base.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 288;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const flip = window.innerHeight - r.bottom < 340 && r.top > window.innerHeight - r.bottom;
      setPos(flip ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !popupRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const blocked = (key: string) => (!!min && key < min) || (!!max && key > max);
  const today = todayKey();

  function pick(key: string) {
    onChange(key);
    setOpen(false);
  }

  function goToday() {
    if (blocked(today)) return;
    pick(today);
  }

  const first = new Date(view.y, view.mo, 1).getDay();
  const count = new Date(view.y, view.mo + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const monthLabel = new Date(view.y, view.mo, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const step = (by: number) =>
    setView((v) => {
      const d = new Date(v.y, v.mo + by, 1);
      return { y: d.getFullYear(), mo: d.getMonth() };
    });

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            // Open on the month of the chosen date (or the current month when empty).
            const base = parsed ? new Date(Number(parsed[1]), Number(parsed[2]) - 1, 1) : new Date();
            setView({ y: base.getFullYear(), mo: base.getMonth() });
          }
          setOpen((o) => !o);
        }}
        className="w-full min-h-9 flex items-center justify-between gap-2 bg-card border border-border rounded-xl px-3 py-2 text-base sm:text-sm text-left outline-none focus:border-primary cursor-pointer"
      >
        <span className={parsed ? "" : "text-muted-foreground"}>{show(value, placeholder)}</span>
        <CalendarDays size={16} aria-hidden="true" className="flex-shrink-0 text-muted-foreground" />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            {/* Dimmed backdrop, phones only; the calendar below is centred on screen. */}
            <div aria-hidden="true" className="fixed inset-0 z-[99] bg-black/40 sm:hidden" onClick={() => setOpen(false)} />
            <div
              ref={popupRef}
              role="dialog"
              aria-label={ariaLabel}
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
              className="fixed z-[100] w-72 max-sm:!top-1/2 max-sm:!bottom-auto max-sm:!left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 max-sm:w-[calc(100vw-2rem)] max-sm:max-w-sm rounded-xl border border-border bg-card shadow-lg"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{monthLabel}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="p-2 rounded hover:bg-secondary cursor-pointer">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" aria-label="Next month" onClick={() => step(1)} className="p-2 rounded hover:bg-secondary cursor-pointer">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
                  {WEEKDAYS.map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (d === null) return <span key={`b${i}`} />;
                    const key = dayKey(view.y, view.mo, d);
                    const disabled = blocked(key);
                    const selected = value === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => pick(key)}
                        className={`h-10 sm:h-8 rounded-lg text-sm tabular-nums ${
                          disabled
                            ? "opacity-30 cursor-not-allowed"
                            : selected
                              ? "bg-primary text-white cursor-pointer"
                              : key === today
                                ? "border border-primary text-primary cursor-pointer hover:bg-secondary"
                                : "hover:bg-secondary cursor-pointer"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                  <button
                    type="button"
                    onClick={() => pick("")}
                    disabled={!value}
                    className="px-2 py-2 sm:py-1 text-primary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={goToday}
                    disabled={blocked(today)}
                    className="px-2 py-2 sm:py-1 text-primary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
