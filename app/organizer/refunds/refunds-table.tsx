"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  approveRefundRequest,
  formatDate,
  formatMoney,
  rejectRefundRequest,
  type RefundRequestItem,
} from "@/lib/api";

type LocalStatus = "completed" | "rejected";

// The refund-requests API doesn't return a customer-supplied reason yet —
// shown as static placeholder text so the column matches Figma until that
// field exists; swap for `request.reason` once the API adds it.
const REASON_PLACEHOLDER = "No reason provided";

export function RefundsTable({
  refundRequests,
  onActioned,
  onFailed,
}: {
  refundRequests: RefundRequestItem[];
  // Called after a successful approve/reject so the page can refetch the list and stats.
  onActioned: (action: LocalStatus) => void;
  onFailed: (message: string) => void;
}) {
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: LocalStatus } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);

  async function handleAction(id: string, action: LocalStatus) {
    if (busyId) return;
    if (action === "rejected" && !rejectReason.trim()) {
      setActionError({ id, message: "Please enter a reason for rejecting." });
      return;
    }
    setBusyId(id);
    setActionError(null);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      await (action === "completed" ? approveRefundRequest(id, token) : rejectRefundRequest(id, rejectReason.trim(), token));
      setConfirmAction(null);
      setRejectReason("");
      onActioned(action);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setActionError({ id, message });
      onFailed(message);
    } finally {
      setBusyId(null);
    }
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
            const status = request.status;
            const busy = busyId === request.id;
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
                        onClick={() => {
                          setActionError(null);
                          setConfirmAction({ id: request.id, action: "completed" });
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          setRejectReason("");
                          setConfirmAction({ id: request.id, action: "rejected" });
                        }}
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
                      {confirmAction.action === "rejected" && (
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          disabled={busy}
                          placeholder="Reason for rejecting…"
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-60"
                        />
                      )}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAction(request.id, confirmAction.action)}
                          disabled={busy}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 text-white shadow-sm disabled:opacity-60 disabled:pointer-events-none ${
                            confirmAction.action === "completed" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {busy ? "Processing…" : "Yes, confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Cancel
                        </button>
                      </div>
                      {actionError?.id === request.id && (
                        <span className="text-xs text-red-600 max-w-48">{actionError.message}</span>
                      )}
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
