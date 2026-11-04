"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { LoadError } from "@/components/organizer/load-error";

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

export default function OrganizerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        const data = await getDashboard(token);
        if (!cancelled) {
          setDashboard(data);
          setStatus("ready");
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err);
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (status === "loading") return <DashboardSkeleton />;

  if (status === "error" || !dashboard) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader title="My Dashboard" subtitle="Overview of your events and sales." />
        <div className="mt-6">
          <LoadError error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      </div>
    );
  }

  const live = dashboard;
  const events = toDisplayEvents(live);
  const orders = toDisplayOrders(live);
  const revenue = live.total_revenue;
  const tickets = live.total_tickets_sold;
  const eventCount = live.total_events;
  const teamMembers = live.total_team_members;
  const changeLabel = `${isNegativeAmount(live.revenue_change_percent) ? "↓" : "↑"} ${formatPercent(live.revenue_change_percent)} this month`;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="My Dashboard" subtitle="Overview of your events and sales." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Revenue" value={formatMoney(revenue)} icon={DollarSign} sub={changeLabel} />
        <StatCard label="Tickets Sold" value={tickets} icon={Ticket} />
        <StatCard label="My Events" value={eventCount} icon={Calendar} />
        <StatCard label="Team Members" value={teamMembers} icon={Users} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold font-(family-name:--font-display)">My Events</h3>
          <Link href="/organizer/events" className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
            See My All Events →
          </Link>
        </div>
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
