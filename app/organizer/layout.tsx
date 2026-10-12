"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizerSidebar } from "@/components/organizer/sidebar";
import { hasSession } from "@/lib/auth";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      router.replace("/");
      return;
    }
    // Mount-only check of localStorage-backed session state; it can't be
    // read during SSR, so this is the earliest point it can be resolved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="flex flex-col lg:flex-row relative h-dvh bg-background overflow-hidden">
      <OrganizerSidebar />
      <main className="relative flex-1 min-h-0 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
