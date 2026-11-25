export function EventDetailSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-pulse" aria-busy="true" aria-label="Loading event">
      <div className="relative h-44 min-h-44 flex-shrink-0 bg-secondary">
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col items-start sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-2.5">
            <div className="h-3 w-16 bg-background/60 rounded" />
            <div className="h-6 w-64 max-w-full bg-background/60 rounded-lg" />
            <div className="h-3 w-40 bg-background/60 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-background/60 rounded-lg" />
            <div className="h-6 w-20 bg-background/60 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch border-b border-border flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border flex-1 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border sm:[&>*:nth-child(n+3)]:border-t-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="px-4 sm:px-5 py-3 sm:py-3.5 space-y-2">
              <div className="h-3 w-16 bg-secondary rounded" />
              <div className="h-4 w-12 bg-secondary rounded" />
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 px-4 py-3 sm:py-0 flex items-center border-t sm:border-t-0 sm:border-l border-border">
          <div className="h-8 w-full sm:w-36 bg-secondary rounded-lg" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="h-4 w-24 bg-secondary rounded" />
          <div className="h-3 w-full bg-secondary rounded" />
          <div className="h-3 w-2/3 bg-secondary rounded" />
        </div>

        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-secondary rounded" />
          <div className="h-3 w-16 bg-secondary rounded" />
        </div>

        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-secondary" />
              <div className="h-4 w-44 bg-secondary rounded" />
            </div>
            <div className="bg-card border border-border rounded-2xl h-[72px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
