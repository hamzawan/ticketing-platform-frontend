"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, RotateCcw, Search, X, XCircle } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { RefundsSkeleton } from "@/components/organizer/refunds-skeleton";
import { ACCESS_TOKEN_STORAGE_KEY, getRefundRequests, type RefundRequestsResponse } from "@/lib/api";
import { RefundsTable } from "./refunds-table";

// Figma's mock status set is pending/approved/rejected; the real API's
// "completed" is this app's equivalent of an approved refund.
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

export default function RefundsPage() {
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<RefundRequestsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Set when the refetch follows an approve/reject: refresh the data in
  // place instead of swapping the page back to its loading state.
  const silentRefreshRef = useRef(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const silent = silentRefreshRef.current;
      silentRefreshRef.current = false;
      if (!silent) setLoadStatus("loading");
      try {
        const response = await getRefundRequests({ page, status: statusFilter || undefined }, getStoredToken());
        if (!cancelled) {
          setData(response);
          setLoadStatus("ready");
        }
      } catch (err) {
        if (cancelled) return;
        if (silent) {
          setToast({ type: "error", message: "Couldn't refresh the list. Please reload the page." });
          return;
        }
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        setLoadStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, reloadKey]);

  function applyStatusFilter(value: string) {
    setPage(1);
    setStatusFilter(value);
  }

  if (loadStatus === "loading" && !data) {
    return <RefundsSkeleton />;
  }

  const q = search.trim().toLowerCase();
  const filtered = data
    ? data.results.filter((r) => !q || r.customer_name.toLowerCase().includes(q) || r.customer_email.toLowerCase().includes(q))
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black font-(family-name:--font-display)">Refund Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Review and action customer refund requests.</p>
        </div>
        {(data?.total_pending_requests ?? 0) > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{data?.total_pending_requests} pending</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-48 bg-card border border-border rounded-xl px-4 py-2.5">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => applyStatusFilter(s.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                statusFilter === s.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loadStatus === "error" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3">
          Failed to load refund requests{errorMessage ? `: ${errorMessage}` : "."}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loadStatus === "ready" && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <RotateCcw size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {data && data.results.length === 0 && !search && !statusFilter
                ? "No refund requests yet."
                : "No refund requests match your filters."}
            </p>
          </div>
        ) : (
          loadStatus === "ready" &&
          data && (
            <>
              <RefundsTable
                refundRequests={filtered}
                onActioned={(action) => {
                  setToast({
                    type: "success",
                    message: action === "completed" ? "Refund request approved." : "Refund request rejected.",
                  });
                  silentRefreshRef.current = true;
                  setReloadKey((k) => k + 1);
                }}
                onFailed={(message) => setToast({ type: "error", message })}
              />
              <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
            </>
          )
        )}
      </div>
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 max-w-sm rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={16} className="flex-shrink-0" /> : <XCircle size={16} className="flex-shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
