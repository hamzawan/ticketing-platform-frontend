"use client";

import { LoadError } from "@/components/organizer/load-error";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarPlus, Hash, Mail, RefreshCw, Ticket, User, X, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TicketCard, TICKET_STATUS_STYLES } from "@/components/organizer/ticket-card";
import { Select } from "@/components/ui/select";
import { ACCESS_TOKEN_STORAGE_KEY, formatDateTime, getTickets, type TicketFilters, type TicketItem } from "@/lib/api";

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

const INPUT_CLASS = "bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary";

// Local (not UTC) YYYY-MM-DD, matching what <input type="date"> expects.
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Empty <input type="date"> renders blank on iOS Safari (and inconsistently on Android),
// so while empty we hide the native text and overlay our own placeholder.
function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 min-w-36 sm:flex-none">
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`${INPUT_CLASS} w-full min-w-0 min-h-9 appearance-none pr-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${value ? "" : "text-transparent"}`}
        />
        {/* Our own icon: iOS Safari drops the native indicator once appearance is reset. */}
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        {!value && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base sm:text-sm text-muted-foreground">
            {label}
          </span>
        )}
      </div>
      {/* Mobile native pickers (iOS/Android) have no Today/Clear, so provide our own. */}
      <div className="mt-1 flex justify-between px-1 text-xs sm:hidden">
        <button type="button" onClick={() => onChange(todayLocal())} className="text-primary">
          Today
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={!value}
          className="text-muted-foreground disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function TicketsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-card rounded-2xl h-[420px]" />
      ))}
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: LucideIcon; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent" style={{ color: "var(--sidebar)" }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className={`text-sm font-medium break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
      </div>
    </div>
  );
}

// Read-only details of the already-loaded ticket. No scan/validate request is
// made from here — see the notes on the missing check-ticket endpoint.
function TicketDialog({ ticket, onClose }: { ticket: TicketItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = (ticket.status ?? "").toLowerCase();
  const created = formatDateTime(ticket.created_at) || "—";
  const updated = formatDateTime(ticket.updated_at) || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ticket details"
        className="bg-card rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 text-white" style={{ backgroundColor: "var(--sidebar)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Ticket size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold leading-tight">Ticket details</h2>
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                  TICKET_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {ticket.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 opacity-80 hover:bg-white/15 hover:opacity-100">
            <X size={16} />
          </button>
        </div>

        <dl className="space-y-4 p-5">
          {ticket.user_name && <Row icon={User} label="Name" value={ticket.user_name} />}
          {ticket.user_email && <Row icon={Mail} label="Email" value={ticket.user_email} />}
          <Row icon={Hash} label="Ticket ID" value={ticket.id} mono />
          <Row icon={Hash} label="Booking ID" value={ticket.booking_id} mono />
          <Row icon={CalendarPlus} label="Created" value={created} />
          <Row icon={RefreshCw} label="Updated" value={updated} />
        </dl>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [draft, setDraft] = useState<TicketFilters>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<TicketItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTickets(filters, page, getStoredToken())
      .then((res) => {
        if (cancelled) return;
        // Later pages are appended to what's already on screen.
        setTickets((prev) => {
          if (page === 1) return res.results;
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...res.results.filter((t) => !seen.has(t.id))];
        });
        setTotal(res.total);
        setLoadStatus("ready");
        setLoadingMore(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (page > 1) {
          setMoreError(true);
          setLoadingMore(false);
          return;
        }
        setLoadError(err);
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const hasMore = tickets.length < total;

  // Load the next page when the end of the list scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadStatus !== "ready" || loadingMore || moreError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setLoadingMore(true);
        setPage((p) => p + 1);
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadStatus, loadingMore, moreError, tickets.length]);

  const openTicket = useCallback((t: TicketItem) => setSelected(t), []);
  const closeTicket = useCallback(() => setSelected(null), []);

  const hasFilters = Boolean(filters.customer_email || filters.date_from || filters.date_to || filters.status);

  const next: TicketFilters = {
    status: draft.status || undefined,
    customer_email: draft.customer_email?.trim() || undefined,
    date_from: draft.date_from || undefined,
    date_to: draft.date_to || undefined,
  };
  // Enabled only when the form differs from what's applied (including clearing a filter back to "All").
  const canApply = JSON.stringify(next) !== JSON.stringify(filters);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    if (!canApply) return;
    setLoadStatus("loading");
    setMoreError(false);
    setPage(1);
    setFilters(next);
  }

  function clearFilters() {
    setDraft({});
    setPage(1);
    setMoreError(false);
    setLoadStatus("loading");
    setFilters({});
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="My Tickets" subtitle="Your available event tickets" />

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 mb-5">
        <input
          type="email"
          value={draft.customer_email ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, customer_email: e.target.value }))}
          placeholder="Customer email"
          aria-label="Customer email"
          className="bg-card border border-border rounded-xl px-3 py-2 text-base sm:text-sm outline-none focus:border-primary flex-1 min-w-48"
        />
        <DateFilter
          label="Start date"
          value={draft.date_from ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, date_from: v }))}
        />
        <DateFilter
          label="End date"
          value={draft.date_to ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, date_to: v }))}
        />
        <Select
          className="w-full sm:w-44"
          value={draft.status ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
          placeholder="All status"
          ariaLabel="Filter by status"
          options={[
            { value: "", label: "All status" },
            { value: "issued", label: "Issued" },
            { value: "entered", label: "Entered" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
        <button type="submit" disabled={!canApply} className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
          Apply
        </button>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground py-2">
            Clear
          </button>
        )}
      </form>

      {loadStatus === "loading" && <TicketsSkeleton />}

      {loadStatus === "error" && (
        <LoadError
          error={loadError}
          onRetry={() => {
            setLoadStatus("loading");
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {loadStatus === "ready" && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
            <Ticket size={18} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{hasFilters ? "No tickets match your filters." : "No tickets yet."}</p>
        </div>
      )}

      {loadStatus === "ready" && tickets.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} onCheck={openTicket} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-px" />
          {loadingMore && <p className="py-4 text-center text-xs text-muted-foreground">Loading more tickets…</p>}
          {moreError && (
            <p className="py-4 text-center text-xs text-red-600">
              Couldn&apos;t load more tickets.{" "}
              <button
                onClick={() => {
                  setMoreError(false);
                  setLoadingMore(true);
                  setReloadKey((k) => k + 1);
                }}
                className="font-semibold underline"
              >
                Retry
              </button>
            </p>
          )}
        </>
      )}

      {selected && <TicketDialog ticket={selected} onClose={closeTicket} />}
    </div>
  );
}
