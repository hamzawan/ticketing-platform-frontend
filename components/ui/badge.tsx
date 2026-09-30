const STATUS_STYLES: Record<string, string> = {
  "on-sale": "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-slate-100 text-slate-500 border-slate-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  refunded: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
};

// The API's "ended" status reads better to organizers as "Completed" — the
// underlying status value (used for filtering/styling) is unchanged.
const STATUS_LABELS: Record<string, string> = {
  ended: "Completed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs border rounded-full px-2.5 py-0.5 font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      {STATUS_LABELS[status] ?? status.replace("-", " ")}
    </span>
  );
}
