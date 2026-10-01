"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ACCESS_TOKEN_STORAGE_KEY, formatBookingTicketTypes, formatMoney, getBookings, type BookingsResponse } from "@/lib/api";

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

function fmtBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Local calendar day (YYYY-MM-DD) so the From/To inputs compare like-for-like.
function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [eventSel, setEventSel] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadStatus("loading");
      try {
        const response = await getBookings(page, getStoredToken());
        if (cancelled) return;
        setData(response);
        setLoadStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        setLoadStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const hasFilters = Boolean(search || eventSel !== "all" || dateFrom || dateTo);

  // The API only paginates; search / event / date narrow the loaded page.
  const eventOptions = useMemo(() => Array.from(new Set((data?.results ?? []).map((b) => b.event_name))).sort(), [data]);

  const paged = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.results ?? []).filter((b) => {
      if (eventSel !== "all" && b.event_name !== eventSel) return false;
      const day = localDay(b.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (q && !b.customer_email.toLowerCase().includes(q) && !b.customer_name.toLowerCase().includes(q) && !b.booking_number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, eventSel, dateFrom, dateTo]);

  function resetFilters() {
    setSearch("");
    setEventSel("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title="Bookings" subtitle="All bookings across every event." />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={eventSel}
          onChange={(e) => {
            setEventSel(e.target.value);
          }}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-foreground"
        >
          <option value="all">All Events</option>
          {eventOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs text-muted-foreground">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
            }}
            className="bg-transparent text-sm outline-none text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs text-muted-foreground">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
            }}
            className="bg-transparent text-sm outline-none text-foreground"
          />
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-2.5 bg-card hover:bg-secondary transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loadStatus === "loading" ? (
          <div className="divide-y divide-border" aria-busy="true" aria-label="Loading bookings">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 w-24 rounded bg-secondary" />
                <div className="h-3 flex-1 rounded bg-secondary" />
                <div className="h-3 w-20 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : loadStatus === "error" ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm font-medium text-red-700">Failed to load bookings{errorMessage ? `: ${errorMessage}` : "."}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <BookOpen size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{hasFilters ? "No bookings match your filters." : "No bookings yet."}</p>
            {hasFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    {["Booking ID", "Customer", "Event", "Ticket Type", "Tickets", "Amount", "Booking Date", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-semibold px-5 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((b) => (
                    <tr key={b.booking_number} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.booking_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-semibold">{b.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-36 truncate">{b.event_name}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatBookingTicketTypes(b.ticket_types)}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-center">{b.tickets_count}</td>
                      <td className="px-5 py-3.5 text-xs font-bold">{formatMoney(b.total_amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{fmtBookingDate(b.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 font-medium capitalize ${STATUS_STYLE[b.status.toLowerCase()] ?? ""}`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {loadStatus === "ready" && data && data.total > 0 && (
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
