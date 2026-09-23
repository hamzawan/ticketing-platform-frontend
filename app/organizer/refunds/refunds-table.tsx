"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import type { Order } from "@/lib/data";

export function RefundsTable({ orders }: { orders: Order[] }) {
  const [statuses, setStatuses] = useState<Record<string, Order["status"]>>(
    Object.fromEntries(orders.map((o) => [o.id, o.status])),
  );

  const processRefund = (id: string) => setStatuses((prev) => ({ ...prev, [id]: "refunded" }));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              {["Order", "Customer", "Event", "Ticket Type", "Amount", "Date", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs text-muted-foreground font-medium p-4 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => {
              const status = statuses[o.id];
              const canRefund = status === "completed" || status === "pending";
              return (
                <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="p-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{o.id}</td>
                  <td className="p-4">
                    <div className="font-semibold text-sm whitespace-nowrap">{o.customer}</div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{o.event}</td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{o.type}</td>
                  <td className="p-4 text-xs font-semibold whitespace-nowrap">${o.amount}</td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{o.date}</td>
                  <td className="p-4">
                    <StatusBadge status={status} />
                  </td>
                  <td className="p-4">
                    {canRefund ? (
                      <button
                        onClick={() => processRefund(o.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 whitespace-nowrap"
                      >
                        <RefreshCw size={12} /> Issue Refund
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
