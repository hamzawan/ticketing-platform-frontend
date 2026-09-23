import Link from "next/link";
import { BarChart3, Calendar, Edit2, MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { myEvents } from "@/lib/data";

export default function MyEventsPage() {
  const events = myEvents();

  return (
    <div className="p-4 sm:p-6 space-y-5">
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
                    {e.ticketTypes.length} ticket type{e.ticketTypes.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="p-4 flex flex-row sm:flex-col gap-2 justify-center border-t sm:border-t-0 sm:border-l border-border">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                  <Edit2 size={12} /> Edit
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                  <BarChart3 size={12} /> Stats
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
