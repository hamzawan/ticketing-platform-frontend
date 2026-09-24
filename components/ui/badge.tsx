const STATUS_STYLES: Record<string, string> = {
  "on-sale": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ended: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refunded: "bg-red-500/10 text-red-400 border-red-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs border rounded-full px-2.5 py-0.5 font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      }`}
    >
      {status.replace("-", " ")}
    </span>
  );
}
