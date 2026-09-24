"use client";

import { useEffect, useState } from "react";
import { Calendar, DollarSign, Ticket, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DashboardSkeleton } from "@/components/organizer/dashboard-skeleton";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  getDashboard,
  formatMoney,
  formatPercent,
  formatDate,
  hasPositiveAmount,
  isNegativeAmount,
  type DashboardResponse,
} from "@/lib/api";
import { myEvents, myOrders } from "@/lib/data";

// Revenue/amount/percent are kept as raw strings end-to-end (never routed
// through Number()) so formatMoney/formatPercent can render arbitrarily
// large API values without losing precision.
type DisplayEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  capacity: number;
  sold: number;
  revenue: string;
  status: string;
};

type DisplayOrder = {
  id: string;
  customer: string;
  event: string;
  type: string;
  amount: string;
  status: string;
};

function toDisplayEvents(dashboard: DashboardResponse): DisplayEvent[] {
  return dashboard.latest_events.map((e) => ({
    id: e.id,
    name: e.name,
    date: formatDate(e.event_date),
    venue: `${e.venue}${e.city ? ` · ${e.city}` : ""}`,
    capacity: e.total_tickets,
    sold: e.tickets_sold,
    revenue: e.revenue,
    status: e.total_tickets > 0 && e.tickets_sold >= e.total_tickets ? "ended" : "on-sale",
  }));
}

function toMockEvents(source: ReturnType<typeof myEvents>): DisplayEvent[] {
  return source.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    venue: `${e.venue} · ${e.city}`,
    capacity: e.capacity,
    sold: e.sold,
    revenue: String(e.revenue),
    status: e.status,
  }));
}

function toDisplayOrders(dashboard: DashboardResponse): DisplayOrder[] {
  return dashboard.latest_bookings.map((b) => ({
    id: b.id,
    customer: b.customer_name,
    event: b.event_name,
    type: b.ticket_type_name,
    amount: b.payment_amount,
    status: b.payment_status ? b.payment_status.toLowerCase() : "pending",
  }));
}

function toMockOrders(source: ReturnType<typeof myOrders>): DisplayOrder[] {
  return source.slice(0, 4).map((o) => ({
    id: o.id,
    customer: o.customer,
    event: o.event,
    type: o.type,
    amount: String(o.amount),
    status: o.status,
  }));
}

export default function OrganizerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        // In production the access token is written to localStorage by the
        // sign-in flow. There's no sign-in flow yet, so this reads whatever
        // is there (or nothing) — the request still goes out unauthenticated
        // if no token is present, and the catch below handles the 401.
        const token =
          typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
        const data = await getDashboard(token);
        if (!cancelled) {
          setDashboard(data);
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

  if (status === "loading") return <DashboardSkeleton />;

  const live = status === "ready" ? dashboard : null;
  const events = live ? toDisplayEvents(live) : toMockEvents(myEvents());
  const orders = live ? toDisplayOrders(live) : toMockOrders(myOrders());

  const revenue = live ? live.total_revenue : String(myEvents().reduce((s, e) => s + e.revenue, 0));
  const tickets = live ? live.total_tickets_sold : myEvents().reduce((s, e) => s + e.sold, 0);
  const eventCount = live ? live.total_events : events.length;
  const teamMembers = live ? live.total_team_members : 0;

  const changeLabel = live
    ? `${isNegativeAmount(live.revenue_change_percent) ? "↓" : "↑"} ${formatPercent(live.revenue_change_percent)} this month`
    : "Sample data";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="My Dashboard" subtitle="Overview of your events and sales." />

      {!live && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-2xl px-4 py-3">
          Live API unreachable{errorMessage ? ` (${errorMessage})` : ""} — showing sample data. Set{" "}
          <code className="font-mono">{ACCESS_TOKEN_STORAGE_KEY}</code> in localStorage with a valid bearer
          token.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Revenue" value={formatMoney(revenue)} icon={DollarSign} sub={changeLabel} />
        <StatCard label="Tickets Sold" value={tickets} icon={Ticket} />
        <StatCard label="My Events" value={eventCount} icon={Calendar} />
        <StatCard label="Team Members" value={teamMembers} icon={Users} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4 font-(family-name:--font-display)">My Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-background border border-border rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.date} · {e.venue}
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={e.sold} max={e.capacity} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.sold} / {e.capacity} tickets
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold">
                    {hasPositiveAmount(e.revenue) ? formatMoney(e.revenue) : "—"}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4 font-(family-name:--font-display)">Recent Orders</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{o.customer}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.event} · {o.type}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-xs font-semibold">{formatMoney(o.amount)}</div>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
