import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found · Big Bounce America",
};

// Ticket with a torn-off stub, echoing the floating tickets on the sign-in
// illustration. Colors are the same brand blues/accents used there.
function TicketIllustration() {
  return (
    <svg viewBox="0 0 320 150" className="w-full max-w-xs sm:max-w-sm mx-auto" role="img" aria-label="Torn ticket">
      <g transform="rotate(-6 160 75)">
        <path
          d="M20 20 H228 V58 a17 17 0 0 0 0 34 V130 H20 a14 14 0 0 1 -14 -14 V34 a14 14 0 0 1 14 -14 Z"
          fill="#0066FF"
        />
        <rect x="228" y="20" width="76" height="110" rx="14" fill="#1D4ED8" />
        <line x1="228" y1="30" x2="228" y2="120" stroke="white" strokeWidth="2" strokeDasharray="5 5" opacity="0.7" />
        <text x="124" y="97" textAnchor="middle" fontSize="64" fontWeight="900" fill="white" fontFamily="var(--font-display)">
          404
        </text>
        <rect x="40" y="38" width="60" height="6" rx="3" fill="white" opacity="0.7" />
        <rect x="256" y="52" width="20" height="26" rx="4" fill="white" opacity="0.35" />
        <rect x="256" y="86" width="20" height="6" rx="3" fill="white" opacity="0.5" />
      </g>
      <circle cx="30" cy="14" r="5" fill="#FCD34D" />
      <circle cx="296" cy="22" r="4" fill="#F87171" />
      <circle cx="300" cy="134" r="5" fill="#34D399" />
      <circle cx="16" cy="136" r="4" fill="#A78BFA" />
      <path d="M268 8 L270 1 L272 8 L279 10 L272 12 L270 19 L268 12 L261 10 Z" fill="#FCD34D" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main
      className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center"
      style={{ backgroundColor: "#F0F6FF" }}
    >
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #93C5FD 0%, transparent 70%)", transform: "translate(-30%, 30%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Lock size={14} className="text-white" />
          </div>
          <div className="text-sm font-black font-(family-name:--font-display)">Big Bounce America</div>
        </div>

        <TicketIllustration />

        <h1 className="mt-8 text-3xl sm:text-4xl font-black font-(family-name:--font-display)">Page Not Found</h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          Looks like this page bounced out of the arena. The link may be broken or the page may have moved.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 24px rgba(0,102,255,0.35)" }}
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>
    </main>
  );
}
