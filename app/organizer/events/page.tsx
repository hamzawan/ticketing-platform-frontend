"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, MapPin, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { EventDetailPanel } from "@/components/organizer/event-detail-panel";
import { MyEventsSkeleton } from "@/components/organizer/events-skeleton";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  formatEventDate,
  getEvents,
  getMyEvents,
  resolveMediaUrl,
  type MyEventListItem,
  type OrganizerEvent,
} from "@/lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&h=280&fit=crop&auto=format";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "on-sale", label: "On Sale" },
  { value: "draft", label: "Draft" },
  { value: "ended", label: "Completed" },
] as const;

type DisplayEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  status: string;
  capacity: number;
  sold: number;
  sessionCount: number;
  // Revenue from sold tickets; derived from the full event records (not in the list API).
  revenue: number;
  image: string;
};

// Maps the API's event status values to the internal status keys the
// filter pills / StatusBadge style map key off. The API uses "completed"
// for a finished event, which this app displays as "ended" internally
// (StatusBadge then labels it "Completed" with the gray/finished style) —
// keeping that separate from "completed" as used elsewhere (e.g. refunds)
// which should stay the green/success style.
function normalizeEventStatus(status: string): string {
  if (status === "completed") return "ended";
  return status.replace(/_/g, "-");
}

function toDisplayEvents(events: MyEventListItem[]): DisplayEvent[] {
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: formatEventDate(e.event_date),
    venue: e.venue,
    city: e.city ?? "",
    status: normalizeEventStatus(e.status),
    capacity: e.total_tickets,
    sold: e.tickets_sold,
    // Temporary: the list API has no session count yet, so assume one session.
    sessionCount: e.sessions_count ?? 1,
    revenue: 0,
    image: resolveMediaUrl(e.first_image) ?? FALLBACK_IMAGE,
  }));
}

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

export default function MyEventsPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganizerEvent | null>(null);
  const [detailStatus, setDetailStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const data = await getMyEvents(getStoredToken());
        if (!cancelled) {
          setEvents(toDisplayEvents(data.results));
          setStatus("ready");
        }
        // The my-events list has no session count, so take it from the full
        // event records (same source the details panel uses). Best effort —
        // cards keep their default until it arrives, or if it fails.
        try {
          const all = await getEvents(getStoredToken());
          if (cancelled) return;
          const extra = new Map(
            all.map((e) => [
              e.id,
              {
                sessionCount: Array.isArray(e.sessions) && e.sessions.length > 0 ? e.sessions.length : 1,
                revenue: e.ticket_types.reduce((sum, t) => sum + Number(t.price || 0) * (t.quantity - t.available_quantity), 0),
              },
            ]),
          );
          setEvents((prev) => prev.map((e) => ({ ...e, ...extra.get(e.id) })));
        } catch {
          // keep default session counts
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadDetail() {
      setDetailStatus("loading");
      try {
        const all = await getEvents(getStoredToken());
        const found = all.find((e) => e.id === selectedId) ?? null;
        if (cancelled) return;
        if (!found) {
          setDetailStatus("error");
          return;
        }
        setDetail(found);
        setDetailStatus("ready");
      } catch {
        if (!cancelled) setDetailStatus("error");
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (status === "loading") return <MyEventsSkeleton />;

  const header = (
    <PageHeader
      title="My Events"
      subtitle="Events you are managing, with their sessions and ticket types."
      action={
        <Link
          href="/organizer/events/create"
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> Create Event
        </Link>
      }
    />
  );

  if (status === "error") {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        {header}
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3">
          Failed to load events{errorMessage ? `: ${errorMessage}` : "."}
        </div>
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {detailStatus === "loading" && <p className="text-sm text-muted-foreground py-12 text-center">Loading event…</p>}
        {detailStatus === "error" && (
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3">Failed to load event details.</div>
            <button onClick={() => setSelectedId(null)} className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              ← Back to My Events
            </button>
          </div>
        )}
        {detailStatus === "ready" && detail && <EventDetailPanel event={detail} onBack={() => setSelectedId(null)} />}
      </div>
    );
  }

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
    const matchFilter = filter === "all" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {header}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2.5 flex-1 bg-card border border-border rounded-xl px-4 py-2.5">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === f.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No events yet.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all text-left group"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-32 h-[110px] sm:h-auto flex-shrink-0 bg-secondary relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.image}
                    alt={e.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ height: "100%" }}
                    onError={(ev) => {
                      if (ev.currentTarget.src !== FALLBACK_IMAGE) ev.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm leading-tight truncate font-(family-name:--font-display)">{e.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {e.city || e.venue}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar size={11} />
                      <span>
                        {e.sessionCount} session{e.sessionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {e.capacity > 0 ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden max-w-24">
                          <div
                            className={`h-full rounded-full ${e.sold / e.capacity >= 0.9 ? "bg-orange-500" : "bg-primary"}`}
                            style={{ width: `${Math.min((e.sold / e.capacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {e.sold}/{e.capacity} sold
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No tickets configured</span>
                    )}
                    {e.revenue > 0 && <span className="text-xs font-bold flex-shrink-0">${e.revenue.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center pr-4 flex-shrink-0">
                  <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No events match your search.</div>}
        </div>
      )}
    </div>
  );
}
