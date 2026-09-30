"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatMoney, type RefundRequestItem } from "@/lib/api";

type LocalStatus = "completed" | "rejected";

// The refund-requests API doesn't return a customer-supplied reason yet —
// shown as static placeholder text so the column matches Figma until that
// field exists; swap for `request.reason` once the API adds it.
const REASON_PLACEHOLDER = "No reason provided";

export function RefundsTable({ refundRequests }: { refundRequests: RefundRequestItem[] }) {
  // The refund-requests API doesn't yet expose an approve/reject mutation —
  // until it does, actioning a request here only updates local display
  // state (mirrors the Figma prototype's behavior). Swap this for a real
  // POST call once that endpoint exists.
  const [overrides, setOverrides] = useState<Partial<Record<string, LocalStatus>>>({});
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: LocalStatus } | null>(null);

  function handleAction(id: string, action: LocalStatus) {
    setOverrides((prev) => ({ ...prev, [id]: action }));
    setConfirmAction(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/30">
          <tr>
            {["Customer", "Event", "Reason", "Qty", "Amount", "Requested", "Status", "Actions"].map((h) => (
              <th
                key={h}
                className={`text-left text-xs text-muted-foreground font-semibold px-5 py-3 whitespace-nowrap ${
                  h === "Actions" ? "sticky right-0 bg-secondary/40 shadow-[-4px_0_6px_rgba(0,0,0,0.04)]" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {refundRequests.map((request) => {
            const status = overrides[request.id] ?? request.status;
            const isPending = status === "pending";
            const confirming = confirmAction?.id === request.id;
            return (
              <tr key={request.id} className={`transition-colors ${confirming ? "bg-amber-50" : "hover:bg-secondary/20"}`}>
                <td className="px-5 py-4">
                  <div className="text-xs font-semibold">{request.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{request.customer_email}</div>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground max-w-36 truncate" title={request.event_name}>
                  {request.event_name}
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground max-w-40 truncate" title={REASON_PLACEHOLDER}>
                  {REASON_PLACEHOLDER}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-center">{request.quantity}</td>
                <td className="px-5 py-4 text-xs font-bold">{formatMoney(request.amount)}</td>
                <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(request.created_at)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={status} />
                </td>
                <td
                  className={`px-5 py-4 sticky right-0 shadow-[-4px_0_6px_rgba(0,0,0,0.04)] ${confirming ? "bg-amber-50" : "bg-card"}`}
                >
                  {isPending && !confirming && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmAction({ id: request.id, action: "completed" })}
                        className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: request.id, action: "rejected" })}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                  {isPending && confirming && (
                    <div className="flex flex-col gap-2 min-w-48">
                      <span className="text-xs text-amber-700 font-semibold">
                        {confirmAction.action === "completed" ? "Approve" : "Reject"} this refund?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAction(request.id, confirmAction.action)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 text-white shadow-sm ${
                            confirmAction.action === "completed" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          Yes, confirm
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {status === "completed" && !isPending && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
                      <CheckCircle size={13} /> Approved
                    </span>
                  )}
                  {status === "rejected" && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 whitespace-nowrap">
                      <XCircle size={13} /> Rejected
                    </span>
                  )}
                  {status !== "pending" && status !== "completed" && status !== "rejected" && (
                    <span className="text-xs text-muted-foreground capitalize">{status}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
