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
    <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
            href === activeHref
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Icon size={15} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="p-4 border-b border-border flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <Zap size={13} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold truncate font-(family-name:--font-display)">
          Big Bounce
        </div>
        <div className="text-xs text-muted-foreground truncate">Organizer Portal</div>
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
    <div className="p-2.5 border-t border-border">
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
      <aside className="hidden lg:flex w-52 flex-shrink-0 bg-card border-r border-border flex-col">
        <Brand />
        <NavLinks pathname={pathname} />
        <SignOutButton />
      </aside>

      <div className="lg:hidden flex items-center justify-between gap-2 p-3 bg-card border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-white" />
          </div>
          <div className="text-xs font-bold font-(family-name:--font-display)">Big Bounce</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-card border-r border-border flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-border">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-muted-foreground hover:text-foreground p-1.5 mr-3"
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
