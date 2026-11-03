"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ticket, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TicketCard } from "@/components/organizer/ticket-card";
import { Select } from "@/components/ui/select";
import { ACCESS_TOKEN_STORAGE_KEY, formatDate, getTickets, type TicketFilters, type TicketItem } from "@/lib/api";

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

const INPUT_CLASS = "bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary";

function TicketsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-card rounded-2xl h-[420px]" />
      ))}
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

  const rows: [string, string][] = [
    ["Ticket code", ticket.ticket_code],
    ["Status", ticket.status],
    ["Ticket ID", ticket.id],
    ["Booking ID", ticket.booking_id],
    ["Created", formatDate(ticket.created_at)],
    ["Updated", formatDate(ticket.updated_at)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ticket details"
        className="bg-card rounded-2xl w-full max-w-md p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Ticket details</h2>
          <button onClick={onClose} aria-label="Close" className="opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
        <dl className="space-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold">{label}</dt>
              <dd className="text-sm break-all">{value}</dd>
            </div>
          ))}
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
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

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setLoadStatus("loading");
    setMoreError(false);
    setPage(1);
    setFilters({
      status: draft.status || undefined,
      customer_email: draft.customer_email?.trim() || undefined,
      date_from: draft.date_from || undefined,
      date_to: draft.date_to || undefined,
    });
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
          className={`${INPUT_CLASS} flex-1 min-w-48`}
        />
        <input
          type="date"
          value={draft.date_from ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
          aria-label="From date"
          className={INPUT_CLASS}
        />
        <input
          type="date"
          value={draft.date_to ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
          aria-label="To date"
          className={INPUT_CLASS}
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
        <button type="submit" className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2">
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
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="flex-1">Failed to load tickets{errorMessage ? `: ${errorMessage}` : "."}</span>
          <button onClick={() => {
              setLoadStatus("loading");
              setReloadKey((k) => k + 1);
            }} className="font-semibold underline">
            Retry
          </button>
        </div>
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
