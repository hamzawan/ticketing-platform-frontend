import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const items = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        {items.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                page === p ? "bg-primary text-white" : "border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
