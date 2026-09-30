"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Edit2, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { extractImageUrl, type EventTicketType, type OrganizerEvent } from "@/lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&h=400&fit=crop&auto=format";

type PanelSession = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  ticketTypes: EventTicketType[];
};

function fmtTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function fmtDateLong(d: string): string {
  const date = new Date(`${d}T12:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

// The API's `sessions` array is loosely typed; fall back to the event's own
// date/time/ticket types when it's empty or unrecognisable.
function getSessions(event: OrganizerEvent): PanelSession[] {
  const fallback: PanelSession = {
    id: event.id,
    date: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    ticketTypes: event.ticket_types,
  };
  if (!Array.isArray(event.sessions) || event.sessions.length === 0) return [fallback];

  return event.sessions.map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const id = asString(s.id) ?? `session-${i}`;
    const nested = Array.isArray(s.ticket_types) ? (s.ticket_types as EventTicketType[]) : null;
    return {
      id,
      date: asString(s.session_date) ?? asString(s.date) ?? event.event_date,
      startTime: asString(s.start_time) ?? event.start_time,
      endTime: asString(s.end_time) ?? event.end_time,
      ticketTypes: nested ?? event.ticket_types.filter((t) => t.session_id === id),
    };
  });
}

function TicketTypesTable({ ticketTypes }: { ticketTypes: EventTicketType[] }) {
  if (ticketTypes.length === 0) {
    return (
      <div className="px-5 py-4 text-xs text-muted-foreground italic flex items-center justify-between">
        <span>No ticket types configured for this session.</span>
      </div>
    );
  }
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Types</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["ID", "Name", "Price", "Total", "Available", "Sold"].map((h) => (
              <th key={h} className="text-left text-[10px] text-muted-foreground font-medium px-5 pb-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ticketTypes.map((tt) => {
            const sold = tt.quantity - tt.available_quantity;
            const pct = tt.quantity > 0 ? Math.round((sold / tt.quantity) * 100) : 0;
            const low = tt.quantity > 0 && tt.available_quantity / tt.quantity < 0.15;
            return (
              <tr key={tt.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-2.5 font-mono text-[10px] text-muted-foreground max-w-28 truncate">{tt.id}</td>
                <td className="px-5 py-2.5 font-semibold">{tt.name}</td>
                <td className="px-5 py-2.5 font-semibold">${tt.price}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{tt.quantity.toLocaleString()}</td>
                <td className="px-5 py-2.5">
                  <span className={low ? "text-orange-600 font-semibold" : ""}>{tt.available_quantity.toLocaleString()}</span>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 90 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SessionRow({ session, expanded, onToggle }: { session: PanelSession; expanded: boolean; onToggle: () => void }) {
  const tts = session.ticketTypes;
  const totalQty = tts.reduce((s, t) => s + t.quantity, 0);
  const totalAvail = tts.reduce((s, t) => s + t.available_quantity, 0);
  const sold = totalQty - totalAvail;
  const pct = totalQty > 0 ? Math.round((sold / totalQty) * 100) : 0;

  return (
    <div className={`border border-border rounded-xl overflow-hidden transition-all ${expanded ? "border-primary/40" : ""}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors text-left">
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(session.startTime)}</div>
        <div className="flex-shrink-0 text-xs text-muted-foreground">→</div>
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(session.endTime)}</div>
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {totalQty > 0 ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <div className={`h-full rounded-full ${pct >= 90 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {sold}/{totalQty}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tts.length} ticket type{tts.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">No ticket types yet</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground hidden md:block max-w-28 truncate">{session.id}</span>
          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && <TicketTypesTable ticketTypes={tts} />}
    </div>
  );
}

export function EventDetailPanel({ event, onBack }: { event: OrganizerEvent; onBack: () => void }) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const image = extractImageUrl(event.images[0]) ?? FALLBACK_IMAGE;
  const sessions = useMemo(() => getSessions(event), [event]);

  const dateGroups = useMemo(() => {
    const map: Record<string, PanelSession[]> = {};
    sessions.forEach((s) => {
      (map[s.date] ??= []).push(s);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  const allTTs = event.ticket_types;
  const totalCap = allTTs.reduce((sum, t) => sum + t.quantity, 0);
  const totalAvail = allTTs.reduce((sum, t) => sum + t.available_quantity, 0);
  const totalSold = totalCap - totalAvail;
  const revenue = allTTs.reduce((sum, t) => sum + Number(t.price || 0) * (t.quantity - t.available_quantity), 0);
  // API uses "completed" for a finished event; StatusBadge's "ended" key
  // is what renders that as "Completed" with the gray/finished style.
  const status = event.status === "completed" ? "ended" : event.status.replace(/_/g, "-");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative h-44 flex-shrink-0 bg-secondary overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={event.name} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
          <div>
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft size={12} /> All Events
            </button>
            <h2 className="text-xl font-bold leading-tight font-(family-name:--font-display)">{event.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {event.venue}
                {event.city ? `, ${event.city}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/organizer/events/${event.id}/edit`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary/15 transition-colors"
            >
              <Edit2 size={12} /> Edit
            </Link>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-stretch border-b border-border flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border flex-1">
          {[
            { label: "Sessions", value: sessions.length },
            { label: "Total Capacity", value: totalCap.toLocaleString() },
            { label: "Tickets Sold", value: totalSold.toLocaleString() },
            { label: "Revenue", value: revenue > 0 ? `$${revenue.toLocaleString()}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm font-bold mt-0.5 font-(family-name:--font-display)">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Location */}
        {(event.address || event.map_url) && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                <span className="text-sm font-bold font-(family-name:--font-display)">Location</span>
              </div>
              {event.map_url && (
                <a
                  href={event.map_url.replace("output=embed", "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  Open in Maps <ChevronRight size={11} />
                </a>
              )}
            </div>
            {event.address && (
              <div className="px-5 py-3 text-sm text-muted-foreground flex items-start gap-2">
                <MapPin size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                {event.address}
              </div>
            )}
            {event.map_url && (
              <div className="relative w-full" style={{ height: 220 }}>
                <iframe
                  src={event.map_url}
                  width="100%"
                  height="220"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map for ${event.name}`}
                />
              </div>
            )}
          </div>
        )}

        {event.description && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-2 font-(family-name:--font-display)">About</h3>
            <div
              className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        {dateGroups.map(([date, dateSessions]) => (
          <div key={date}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                <h3 className="text-sm font-bold font-(family-name:--font-display)">{fmtDateLong(date)}</h3>
                <span className="text-xs text-muted-foreground">
                  {dateSessions.length} slot{dateSessions.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {dateSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  expanded={expandedSession === s.id}
                  onToggle={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
