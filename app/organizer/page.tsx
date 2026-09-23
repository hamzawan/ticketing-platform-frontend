import { Calendar, DollarSign, RefreshCw, Ticket } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { myEvents, myOrders } from "@/lib/data";

export default function OrganizerDashboardPage() {
  const events = myEvents();
  const orders = myOrders();
  const revenue = events.reduce((s, e) => s + e.revenue, 0);
  const tickets = events.reduce((s, e) => s + e.sold, 0);
  const pendingRefunds = orders.filter((o) => o.status === "pending" || o.status === "refunded").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="My Dashboard" subtitle="Overview of your events and sales." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Revenue" value={`$${revenue.toLocaleString()}`} icon={DollarSign} sub="↑ 14% this month" />
        <StatCard label="Tickets Sold" value={tickets} icon={Ticket} />
        <StatCard label="My Events" value={events.length} icon={Calendar} />
        <StatCard label="Pending Refunds" value={pendingRefunds} icon={RefreshCw} accent />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4 font-(family-name:--font-display)">My Events</h3>
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-background border border-border rounded-xl">
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
                  {e.revenue > 0 ? `$${e.revenue.toLocaleString()}` : "—"}
                </div>
                <StatusBadge status={e.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4 font-(family-name:--font-display)">Recent Orders</h3>
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
                <div className="text-xs font-semibold">${o.amount}</div>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
