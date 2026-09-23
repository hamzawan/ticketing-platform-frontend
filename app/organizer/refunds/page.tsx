import { CreditCard, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { myOrders } from "@/lib/data";
import { RefundsTable } from "./refunds-table";

export default function RefundsPage() {
  const orders = myOrders();
  const refunded = orders.filter((o) => o.status === "refunded").length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const refundedAmount = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title="Refunds" subtitle="Review orders and issue refunds for your events." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={orders.length} icon={CreditCard} />
        <StatCard label="Pending Review" value={pending} icon={Search} />
        <StatCard label="Refunded" value={refunded} icon={RefreshCw} accent />
        <StatCard label="Refunded Amount" value={`$${refundedAmount.toLocaleString()}`} icon={RefreshCw} />
      </div>

      <RefundsTable orders={orders} />
    </div>
  );
}
