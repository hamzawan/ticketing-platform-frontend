export function MyEventsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-secondary rounded-lg" />
          <div className="h-4 w-56 bg-secondary rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-secondary rounded-xl" />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl h-[140px]" />
        ))}
      </div>
    </div>
  );
}
