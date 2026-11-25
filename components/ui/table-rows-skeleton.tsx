export function TableRowsSkeleton({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
          <div className="h-3 w-24 rounded bg-secondary" />
          <div className="h-3 flex-1 rounded bg-secondary" />
          <div className="h-3 w-20 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}
