"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

// Custom dropdown: the native <select> popup is drawn by the browser and
// can't have rounded corners.
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openMenu() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openMenu();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.min(options.length - 1, Math.max(0, i + step)));
    } else if ((e.key === "Enter" || e.key === " ") && open && active >= 0) {
      e.preventDefault();
      choose(options[active].value);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className="w-full flex items-center justify-between gap-2 bg-background border border-border rounded-xl pl-3 pr-3.5 py-2.5 text-sm text-left outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1.5 w-full max-h-60 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No options</li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  i === active ? "bg-secondary" : ""
                } ${o.value === value ? "font-semibold text-primary" : ""}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={13} className="flex-shrink-0" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
