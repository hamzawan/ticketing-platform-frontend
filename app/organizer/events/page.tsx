"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar, Edit2, MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { MyEventsSkeleton } from "@/components/organizer/events-skeleton";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  formatEventDate,
  getMyEvents,
  resolveMediaUrl,
  type MyEventListItem,
} from "@/lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&h=280&fit=crop&auto=format";

type DisplayEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: string;
  capacity: number;
  sold: number;
  revenue: number;
  ticketTypeCount: number;
  image: string;
};

function toDisplayEvents(events: MyEventListItem[]): DisplayEvent[] {
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: formatEventDate(e.event_date),
    venue: e.venue,
    // API uses "on_sale" — StatusBadge's style map keys off "on-sale".
    status: e.status.replace(/_/g, "-"),
    capacity: e.total_tickets,
    sold: e.tickets_sold,
    // This endpoint doesn't return per-ticket pricing, so revenue can't be
    // derived here (the old /events/list/ + ticket_types price math this
    // used no longer applies) — the "—" fallback already in the JSX below
    // covers this since revenue is always 0.
    revenue: 0,
    ticketTypeCount: e.ticket_types_count,
    image: resolveMediaUrl(e.first_image) ?? FALLBACK_IMAGE,
  }));
}

export default function MyEventsPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const token =
          typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
        const data = await getMyEvents(token);
        if (!cancelled) {
          setEvents(toDisplayEvents(data.results));
          setStatus("ready");
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

  if (status === "loading") return <MyEventsSkeleton />;

  const header = (
    <PageHeader
      title="My Events"
      subtitle="All events you have created and are managing."
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
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl px-4 py-3">
          Failed to load events{errorMessage ? `: ${errorMessage}` : "."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {header}

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No events yet.</p>
      ) : (
        <div className="grid gap-4">
          {events.map((e) => (
            <div
              key={e.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-36 h-[140px] sm:h-auto flex-shrink-0 bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.image}
                    alt={e.name}
                    className="w-full h-full object-cover"
                    style={{ height: "100%" }}
                    onError={(ev) => {
                      if (ev.currentTarget.src !== FALLBACK_IMAGE) ev.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm font-(family-name:--font-display)">{e.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {e.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {e.venue}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-5 mt-3">
                    <div className="text-xs">
                      <span className="font-bold">{e.sold}</span>
                      <span className="text-muted-foreground"> / {e.capacity} sold</span>
                    </div>
                    <div className="text-xs font-bold">
                      {e.revenue > 0 ? `$${e.revenue.toLocaleString()}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.ticketTypeCount} ticket type{e.ticketTypeCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-row sm:flex-col gap-2 justify-center border-t sm:border-t-0 sm:border-l border-border">
                  <Link
                    href={`/organizer/events/${e.id}/edit`}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
                  >
                    <Edit2 size={12} /> Edit
                  </Link>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                    <BarChart3 size={12} /> Stats
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
