export function EventFormSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-pulse">
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-border flex-shrink-0 bg-card">
        <div className="h-5 w-5 bg-secondary rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-secondary rounded-lg" />
          <div className="h-3 w-48 bg-secondary rounded-lg" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-secondary rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="h-5 w-40 bg-secondary rounded-lg" />
            <div className="h-10 w-full bg-secondary rounded-xl" />
            <div className="h-10 w-full bg-secondary rounded-xl" />
            <div className="h-32 w-full bg-secondary rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-secondary rounded-xl" />
              <div className="h-10 bg-secondary rounded-xl" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="h-5 w-32 bg-secondary rounded-lg" />
            <div className="h-10 w-full bg-secondary rounded-xl" />
            <div className="h-10 w-full bg-secondary rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
