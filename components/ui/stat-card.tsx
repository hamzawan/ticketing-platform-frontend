import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            accent ? "bg-accent/10" : "bg-primary/10"
          }`}
        >
          <Icon size={14} className={accent ? "text-accent" : "text-primary"} />
        </div>
      </div>
      <div className="text-2xl font-black font-(family-name:--font-display)">{value}</div>
      {sub && <div className="text-xs text-emerald-400 mt-1">{sub}</div>}
    </div>
  );
}
