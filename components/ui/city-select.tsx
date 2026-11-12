"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getCities } from "@/lib/api";

// Searchable city dropdown for one state. A state can have thousands of
// cities, so options are fetched from the server as the user types.
export function CitySelect({
  state,
  value,
  onChange,
  invalid,
}: {
  state: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const disabled = !state;

  useEffect(() => {
    if (!open || !state) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setFailed(false);
        getCities(state, query, controller.signal)
          .then(setOptions)
          .catch((err) => {
            if (err?.name === "AbortError") return;
            setOptions([]);
            setFailed(true);
          })
          .finally(() => !controller.signal.aborted && setLoading(false));
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, state, query]);

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

  function choose(city: string) {
    onChange(city);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="City"
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`w-full flex items-center justify-between gap-2 bg-background border rounded-xl pl-4 pr-3.5 py-2.5 text-base sm:text-sm text-left outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          invalid ? "border-red-400!" : "border-border"
        }`}
      >
        <span className={`truncate ${value ? "" : "text-muted-foreground"}`}>{value || (disabled ? "Select a state first" : "Select city")}</span>
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
                  if (options[0]) choose(options[0]);
                }
              }}
              placeholder="Search cities…"
              className="w-full bg-background rounded-lg px-3 py-2 text-base sm:text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-auto p-1">
            {loading && options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Loading…</li>
            ) : failed ? (
              <li className="px-3 py-2 text-xs text-red-600">Couldn&apos;t load cities. Try again.</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No cities found</li>
            ) : (
              options.map((city) => (
                <li
                  key={city}
                  role="option"
                  aria-selected={city === value}
                  onClick={() => choose(city)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${
                    city === value ? "font-semibold text-primary" : ""
                  }`}
                >
                  <span className="truncate">{city}</span>
                  {city === value && <Check size={13} className="flex-shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
