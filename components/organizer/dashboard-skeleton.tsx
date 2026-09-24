export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-secondary rounded-lg" />
        <div className="h-4 w-64 bg-secondary rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 h-24" />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 h-56" />
      <div className="bg-card border border-border rounded-2xl p-5 h-40" />
    </div>
  );
}
