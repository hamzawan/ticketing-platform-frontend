"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Edit2, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { extractImageUrl, formatEventDate, type OrganizerEvent } from "@/lib/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&h=400&fit=crop&auto=format";

function fmtTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function TicketTypesTable({ event }: { event: OrganizerEvent }) {
  const tts = event.ticket_types;
  if (tts.length === 0) {
    return <div className="px-5 py-4 text-xs text-muted-foreground italic">No ticket types configured for this session.</div>;
  }
  return (
    <div className="border-t border-border">
      <div className="px-5 pt-3 pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Types</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Name", "Price", "Total", "Available", "Sold"].map((h) => (
              <th key={h} className="text-left text-[10px] text-muted-foreground font-medium px-5 pb-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tts.map((tt) => {
            const sold = tt.quantity - tt.available_quantity;
            const pct = tt.quantity > 0 ? Math.round((sold / tt.quantity) * 100) : 0;
            const low = tt.quantity > 0 && tt.available_quantity / tt.quantity < 0.15;
            return (
              <tr key={tt.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
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

function SessionRow({ event }: { event: OrganizerEvent }) {
  const [expanded, setExpanded] = useState(true);
  const totalQty = event.ticket_types.reduce((s, t) => s + t.quantity, 0);
  const totalAvail = event.ticket_types.reduce((s, t) => s + t.available_quantity, 0);
  const sold = totalQty - totalAvail;
  const pct = totalQty > 0 ? Math.round((sold / totalQty) * 100) : 0;

  return (
    <div className={`border border-border rounded-xl overflow-hidden transition-all ${expanded ? "border-primary/40" : ""}`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors text-left">
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(event.start_time)}</div>
        <div className="flex-shrink-0 text-xs text-muted-foreground">→</div>
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(event.end_time)}</div>
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
                {event.ticket_types.length} ticket type{event.ticket_types.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">No ticket types yet</span>
          )}
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <TicketTypesTable event={event} />}
    </div>
  );
}

export function EventDetailPanel({ event, onBack }: { event: OrganizerEvent; onBack: () => void }) {
  const image = extractImageUrl(event.images[0]) ?? FALLBACK_IMAGE;
  const totalCap = event.ticket_types.reduce((sum, t) => sum + t.quantity, 0);
  const totalAvail = event.ticket_types.reduce((sum, t) => sum + t.available_quantity, 0);
  const totalSold = totalCap - totalAvail;
  const revenue = event.ticket_types.reduce((sum, t) => sum + Number(t.price || 0) * (t.quantity - t.available_quantity), 0);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border flex-shrink-0">
        {[
          { label: "Ticket Types", value: event.ticket_types.length },
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

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {event.description && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-2 font-(family-name:--font-display)">About</h3>
            <div
              className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
            <h3 className="text-sm font-bold font-(family-name:--font-display)">{formatEventDate(event.event_date)}</h3>
          </div>
          <SessionRow event={event} />
        </div>
      </div>
    </div>
  );
}
