"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { BOOKINGS, BOOKING_EVENT_OPTIONS } from "@/lib/mock-bookings";

const PER_PAGE = 8;

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const eventParam = useSearchParams().get("event");
  const [search, setSearch] = useState("");
  const [eventSel, setEventSel] = useState(BOOKING_EVENT_OPTIONS.some((e) => e.id === eventParam) ? eventParam! : "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const hasFilters = Boolean(search || eventSel !== "all" || dateFrom || dateTo);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return BOOKINGS.filter((b) => {
      if (!BOOKING_EVENT_OPTIONS.find((e) => e.id === b.eventId)) return false;
      if (eventSel !== "all" && b.eventId !== eventSel) return false;
      if (dateFrom && b.bookingDate < dateFrom) return false;
      if (dateTo && b.bookingDate > dateTo) return false;
      if (q && !b.customerEmail.toLowerCase().includes(q) && !b.customerName.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, eventSel, dateFrom, dateTo]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function resetFilters() {
    setSearch("");
    setEventSel("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
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
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={eventSel}
          onChange={(e) => {
            setEventSel(e.target.value);
            setPage(1);
          }}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-foreground"
        >
          <option value="all">All Events</option>
          {BOOKING_EVENT_OPTIONS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
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
              setPage(1);
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
              setPage(1);
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
        {paged.length === 0 ? (
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
                    <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{b.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-semibold">{b.customerName}</div>
                        <div className="text-xs text-muted-foreground">{b.customerEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-36 truncate">{b.eventName}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{b.ticketTypeName}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-center">{b.quantity}</td>
                      <td className="px-5 py-3.5 text-xs font-bold">${b.totalAmount}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(`${b.bookingDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 font-medium capitalize ${STATUS_STYLE[b.status] ?? ""}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PER_PAGE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
