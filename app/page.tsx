import Link from "next/link";
import { Calendar, Check, Monitor, Settings, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PORTALS: {
  id: string;
  href: string;
  label: string;
  sublabel: string;
  desc: string;
  Icon: LucideIcon;
  color: string;
  features: string[];
  enabled: boolean;
}[] = [
  {
    id: "admin",
    href: "#",
    label: "Admin",
    sublabel: "Platform owner",
    desc: "Full visibility across all events, users, orders, and platform revenue.",
    Icon: Settings,
    color: "#F97316",
    features: ["All events & organizers", "User management", "Platform reports", "Revenue analytics"],
    enabled: false,
  },
  {
    id: "organizer",
    href: "/organizer",
    label: "Organizer",
    sublabel: "Event creator",
    desc: "Create events, manage tickets, and process refunds for your attendees.",
    Icon: Calendar,
    color: "#2563EB",
    features: ["Create & publish events", "Ticket types & pricing", "My Events dashboard", "Refund management"],
    enabled: true,
  },
  {
    id: "customer",
    href: "#",
    label: "Customer",
    sublabel: "Attendee",
    desc: "Browse events, buy tickets, and access your QR codes.",
    Icon: Ticket,
    color: "#10b981",
    features: ["Browse live events", "Select seats & checkout", "QR ticket delivery"],
    enabled: false,
  },
  {
    id: "pos",
    href: "#",
    label: "Point of Sale",
    sublabel: "Venue staff",
    desc: "On-site ticket sales terminal and real-time attendee check-in.",
    Icon: Monitor,
    color: "#8b5cf6",
    features: ["On-venue ticket sales", "Cash & card payment", "QR code check-in"],
    enabled: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="relative mb-2 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }}
        />
      </div>
      <div className="relative text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-5 text-accent text-xs font-semibold tracking-widest uppercase">
          Big Bounce America · Ticketing Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight font-(family-name:--font-display)">
          Select Your Portal
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-sm mx-auto">
          Choose a role to enter the corresponding portal with its full set of tools and views.
        </p>
      </div>
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        {PORTALS.map((p) => {
          const Icon = p.Icon;
          const card = (
            <>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                style={{ backgroundColor: `${p.color}18`, border: `1px solid ${p.color}33` }}
              >
                <Icon size={20} style={{ color: p.color }} />
              </div>
              <div className="font-black text-base mb-0.5 font-(family-name:--font-display)">{p.label}</div>
              <div className="text-xs text-muted-foreground mb-3">{p.sublabel}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={11} style={{ color: p.color, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {!p.enabled && (
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Coming soon
                </div>
              )}
            </>
          );

          return p.enabled ? (
            <Link
              key={p.id}
              href={p.href}
              className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(37,99,235,0.2),0_8px_32px_rgba(37,99,235,0.1)] transition-all duration-200"
            >
              {card}
            </Link>
          ) : (
            <div
              key={p.id}
              aria-disabled
              className="bg-card border border-border rounded-2xl p-5 text-left opacity-50 cursor-not-allowed"
            >
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
