"use client";

import { zoneAbbreviation } from "@/lib/timezone";
import { LoadError } from "@/components/organizer/load-error";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, RotateCcw, Search } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { ACCESS_TOKEN_STORAGE_KEY, formatBookingTicketTypes, formatMoney, getBookings, getMyEvents, type BookingsResponse } from "@/lib/api";

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

// When the booking was made, in the booking's timezone (falls back to the browser's), e.g. "Nov 12, 3:45 PM CST".
function fmtBookingDate(iso: string, bookingTimeZone?: string | null): string {
  // The API can send UTC timestamps without a "Z"/offset, which JS would read as local time; treat those as UTC.
  const d = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  let timeZone = bookingTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  const text = d.toLocaleString("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const abbr = zoneAbbreviation(timeZone, d);
  return abbr ? `${text} ${abbr}` : text;
}

// The event's date and start time as scheduled in its own timezone, e.g. "Dec 5, 7:00 PM CST".
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used again once the column is re-enabled
function fmtEventDateTime(date?: string | null, time?: string | null, timeZone?: string | null): string {
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  const tm = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!dm || !tm) return "—";
  const [y, mo, day, h, mi] = [dm[1], dm[2], dm[3], tm[1], tm[2]].map(Number);
  // The wall-clock time is already in the event's zone, so print it as-is (UTC avoids any shift)...
  const wall = new Date(Date.UTC(y, mo - 1, day, h, mi));
  const text = wall.toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (!timeZone) return text;
  // ...and name the zone (CST vs CDT) as it applies on that date.
  const abbr = zoneAbbreviation(timeZone, wall);
  return abbr ? `${text} ${abbr}` : text;
}

// Local calendar day (YYYY-MM-DD) so the From/To inputs compare like-for-like.
function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// One server page, or (for client-side filtering) every page merged into one response.
async function fetchBookings(page: number | "all", token: string | null, status?: string): Promise<BookingsResponse> {
  if (page !== "all") return getBookings(page, token, status);
  const first = await getBookings(1, token, status);
  const pageCount = Math.ceil(first.total / first.page_size);
  const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, i) => getBookings(i + 2, token, status)));
  return { ...first, results: [...first.results, ...rest.flatMap((r) => r.results)] };
}

// Names of all the organizer's events (the API is paginated).
async function fetchEventNames(token: string | null): Promise<string[]> {
  const first = await getMyEvents(token, 1);
  const pageCount = Math.ceil(first.total / first.page_size);
  const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, i) => getMyEvents(token, i + 2)));
  return [...first.results, ...rest.flatMap((r) => r.results)].map((e) => e.name);
}

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [eventSel, setEventSel] = useState("all");
  const [statusSel, setStatusSel] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Deep link from an event's "See All Bookings": /organizer/bookings?event=<name>
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("event");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (name) setEventSel(name);
  }, []);

  // The dropdown lists every event, not just those on the loaded page.
  const [eventNames, setEventNames] = useState<string[]>([]);
  useEffect(() => {
    fetchEventNames(getStoredToken())
      .then(setEventNames)
      .catch(() => {});
  }, []);
  const eventOptions = useMemo(() => Array.from(new Set([...eventNames, ...(eventSel !== "all" ? [eventSel] : [])])).sort(), [eventNames, eventSel]);

  const hasFilters = Boolean(search || eventSel !== "all" || statusSel !== "all" || dateFrom || dateTo);
  // The API only paginates and filters by status, so with an event / search / date filter we load
  // every page, filter, and paginate locally. That keeps pages full and covers all bookings.
  const clientFiltered = Boolean(search.trim() || eventSel !== "all" || dateFrom || dateTo);
  const requestPage = clientFiltered ? "all" : page;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadStatus("loading");
      try {
        const response = await fetchBookings(requestPage, getStoredToken(), statusSel === "all" ? undefined : statusSel);
        if (cancelled) return;
        setData(response);
        setLoadStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err);
        setLoadStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requestPage, statusSel, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.results ?? []).filter((b) => {
      if (eventSel !== "all" && b.event_name !== eventSel) return false;
      const day = localDay(b.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      // Any of these can come back null from the API (e.g. guest bookings).
      if (q && ![b.customer_email, b.customer_name, b.booking_number].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, search, eventSel, dateFrom, dateTo]);

  const pageSize = data?.page_size ?? 10;
  const total = clientFiltered ? filtered.length : (data?.total ?? 0);
  const paged = clientFiltered ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  function resetFilters() {
    setSearch("");
    setEventSel("all");
    setStatusSel("all");
    setPage(1);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title="Bookings" subtitle="All bookings across every event." />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 sm:min-w-48 bg-card border border-border rounded-xl px-4 py-2.5">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Select
          value={eventSel}
          onChange={(v) => {
            setEventSel(v);
            setPage(1);
          }}
          ariaLabel="Filter by event"
          className="w-full sm:w-56"
          options={[{ value: "all", label: "All Events" }, ...eventOptions.map((name) => ({ value: name, label: name }))]}
        />
        <Select
          value={statusSel}
          onChange={(v) => {
            setStatusSel(v);
            setPage(1);
          }}
          ariaLabel="Filter by status"
          className="w-full sm:w-40"
          options={[
            { value: "all", label: "All Status" },
            { value: "paid", label: "Paid" },
            { value: "pending", label: "Pending" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <DatePicker
          className="flex-1 min-w-36 sm:flex-none"
          placeholder="Start date"
          ariaLabel="Start date"
          max={dateTo || undefined}
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
        />
        <DatePicker
          className="flex-1 min-w-36 sm:flex-none"
          placeholder="End date"
          ariaLabel="End date"
          min={dateFrom || undefined}
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />
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
          <LoadError error={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
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
              <table className="w-full min-w-[960px] lg:min-w-0 text-sm">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    {[
                      "Booking ID",
                      "Customer",
                      "Event",
                      // "Event Date & Time", // Hidden until the bookings list API returns event date, start time and timezone.
                      "Ticket Type",
                      "Tickets",
                      "Amount",
                      "Booking Date",
                      "Status",
                    ].map((h) => (
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
                      {/* Hidden until the API returns event date, start time and timezone:
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{fmtEventDateTime(b.event_date, b.start_time, b.timezone)}</td>
                      */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatBookingTicketTypes(b.ticket_types)}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-center">{b.tickets_count}</td>
                      <td className="px-5 py-3.5 text-xs font-bold">{formatMoney(b.total_amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{fmtBookingDate(b.created_at, b.booking_timezone)}</td>
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
        {loadStatus === "ready" && data && total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
