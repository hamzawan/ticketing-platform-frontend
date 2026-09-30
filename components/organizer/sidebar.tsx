"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Plus,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { clearSession } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/organizer", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/organizer/events", label: "My Events", Icon: Calendar },
  { href: "/organizer/events/create", label: "Create Event", Icon: Plus },
  { href: "/organizer/refunds", label: "Refunds", Icon: RefreshCw },
];

function matchesHref(pathname: string, href: string) {
  if (href === "/organizer") return pathname === "/organizer";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Several hrefs can match the same pathname (e.g. both "/organizer/events"
// and "/organizer/events/create" match "/organizer/events/create") — only
// the longest (most specific) match should be highlighted.
function getActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of NAV_ITEMS) {
    if (matchesHref(pathname, href) && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const activeHref = getActiveHref(pathname);

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              active ? "bg-white/15 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/8"
            }`}
          >
            <Icon size={15} className={active ? "text-white" : "text-white/50"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
        <Zap size={14} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-white truncate font-(family-name:--font-display)">Big Bounce</div>
        <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
          Organizer Portal
        </div>
      </div>
    </div>
  );
}

function SignOutButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  function handleSignOut() {
    clearSession();
    onNavigate?.();
    router.push("/");
  }

  return (
    <div className="px-3 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-white/50 hover:text-white hover:bg-white/8"
      >
        <LogOut size={15} />
        Sign Out
      </button>
    </div>
  );
}

export function OrganizerSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        className="hidden lg:flex w-56 flex-shrink-0 flex-col"
        style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <Brand />
        <NavLinks pathname={pathname} />
        <SignOutButton />
      </aside>

      <div
        className="lg:hidden flex items-center justify-between gap-2 p-3"
        style={{ backgroundColor: "var(--sidebar)", borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-white" />
          </div>
          <div className="text-xs font-bold text-white font-(family-name:--font-display)">Big Bounce</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside
            className="relative w-64 flex flex-col h-full"
            style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-white/60 hover:text-white p-1.5 mr-3"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <SignOutButton onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
