"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { StateOption } from "@/lib/api";

// Searchable state dropdown. The state list is small and already loaded,
// so it is filtered locally as the user types.
export function StateSelect({
  states,
  value,
  onChange,
  invalid,
}: {
  states: StateOption[];
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? states.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q) : states;
  }, [states, query]);
  const selectedName = states.find((s) => s.code === value)?.name;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    setQuery("");
    setOpen((o) => !o);
  }

  function choose(code: string) {
    onChange(code);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="State"
        onClick={toggle}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`w-full flex items-center justify-between gap-2 bg-background border rounded-xl pl-4 pr-3.5 py-2.5 text-base sm:text-sm text-left outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          invalid ? "border-red-400!" : "border-border"
        }`}
      >
        <span className={`truncate ${selectedName ? "" : "text-muted-foreground"}`}>{selectedName || "Select state"}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg">
          <div className="p-1.5 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (options[0]) choose(options[0].code);
                }
              }}
              placeholder="Search states…"
              className="w-full bg-background rounded-lg px-3 py-2 text-base sm:text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-auto p-1">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No states found</li>
            ) : (
              options.map((s) => (
                <li
                  key={s.code}
                  role="option"
                  aria-selected={s.code === value}
                  onClick={() => choose(s.code)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${
                    s.code === value ? "font-semibold text-primary" : ""
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.code === value && <Check size={13} className="flex-shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
