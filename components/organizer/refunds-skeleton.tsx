export function RefundsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-secondary rounded-lg" />
          <div className="h-4 w-64 bg-secondary rounded-lg" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="h-10 flex-1 min-w-48 bg-secondary rounded-xl" />
        <div className="h-10 w-56 bg-secondary rounded-xl" />
      </div>

      <div className="bg-card border border-border rounded-2xl h-[320px]" />
    </div>
  );
}
