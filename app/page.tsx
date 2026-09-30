"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, RefreshCw } from "lucide-react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  REFRESH_TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  loginOrganizer,
  registerOrganizer,
} from "@/lib/api";
import { hasSession } from "@/lib/auth";

/* ─────────────────────────────────────────────────────────────────────────
 * Switch Portal / role selector — disabled while only the Organizer portal
 * is live. Kept here (unused) for when Admin/Customer/POS portals return.
 * ─────────────────────────────────────────────────────────────────────────

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
    color: "#0066FF",
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

export default function RoleSelectorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="relative text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-accent border border-primary/20 rounded-full px-4 py-1.5 mb-5 text-primary text-xs font-semibold tracking-widest uppercase">
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
              className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(0,102,255,0.2),0_8px_32px_rgba(0,102,255,0.1)] transition-all duration-200"
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

 * ───────────────────────────────────────────────────────────────────────── */

function InputField({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  rightSlot,
  error,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ElementType;
  rightSlot?: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-foreground">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon size={14} />
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
          style={{ paddingLeft: Icon ? "2.5rem" : "0.875rem", paddingRight: rightSlot ? "2.75rem" : "0.875rem" }}
        />
        {rightSlot && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Illustration panel shared by the sign-in and sign-up forms — same
 * background, artwork, and caption on both, so switching tabs never
 * changes the surrounding chrome.
 */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[52%] flex-col items-center justify-center relative overflow-hidden px-12 py-10"
      style={{ backgroundColor: "#F0F6FF" }}
    >
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #DDD6FE 0%, transparent 70%)", transform: "translate(-30%, 30%)" }}
      />

      <svg viewBox="0 0 480 380" className="w-full max-w-lg relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bounce house event illustration">
        <ellipse cx="240" cy="355" rx="210" ry="14" fill="#DBEAFE" />

        {/* Large bounce castle (center) */}
        <rect x="120" y="200" width="180" height="140" rx="6" fill="#3B82F6" />
        <rect x="120" y="200" width="20" height="140" rx="3" fill="#2563EB" />
        <rect x="280" y="200" width="20" height="140" rx="3" fill="#2563EB" />
        <path d="M115 205 Q210 130 305 205 Z" fill="#60A5FA" />
        <path d="M125 205 Q210 140 295 205 Z" fill="#93C5FD" />
        <path d="M165 175 Q210 150 255 175" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <rect x="190" y="270" width="60" height="70" rx="30" fill="#1D4ED8" />
        <rect x="196" y="276" width="48" height="58" rx="24" fill="#BFDBFE" />
        <rect x="138" y="225" width="36" height="28" rx="14" fill="#1D4ED8" />
        <rect x="246" y="225" width="36" height="28" rx="14" fill="#1D4ED8" />
        <rect x="141" y="228" width="30" height="22" rx="11" fill="#BFDBFE" />
        <rect x="249" y="228" width="30" height="22" rx="11" fill="#BFDBFE" />
        <rect x="110" y="185" width="32" height="30" rx="4" fill="#2563EB" />
        <rect x="278" y="185" width="32" height="30" rx="4" fill="#2563EB" />
        <path d="M108 185 L116 170 L124 185 Z" fill="#1D4ED8" />
        <path d="M116 185 L124 170 L132 185 Z" fill="#1D4ED8" />
        <path d="M276 185 L284 170 L292 185 Z" fill="#1D4ED8" />
        <path d="M284 185 L292 170 L300 185 Z" fill="#1D4ED8" />
        <line x1="210" y1="130" x2="210" y2="105" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M210 105 L228 112 L210 119 Z" fill="#EF4444" />
        <rect x="195" y="330" width="50" height="10" rx="3" fill="#1D4ED8" />
        <rect x="200" y="340" width="40" height="10" rx="3" fill="#2563EB" />

        {/* Small bouncy slide (right) */}
        <rect x="315" y="245" width="100" height="95" rx="6" fill="#F59E0B" />
        <rect x="315" y="245" width="15" height="95" rx="3" fill="#D97706" />
        <rect x="400" y="245" width="15" height="95" rx="3" fill="#D97706" />
        <path d="M310 250 Q365 205 420 250 Z" fill="#FCD34D" />
        <path d="M318 250 Q365 213 412 250 Z" fill="#FDE68A" />
        <path d="M338 232 Q365 218 392 232" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <path d="M415 290 L455 340" stroke="#D97706" strokeWidth="12" strokeLinecap="round" />
        <path d="M416 290 L456 340" stroke="#FCD34D" strokeWidth="8" strokeLinecap="round" />
        <rect x="347" y="285" width="36" height="55" rx="18" fill="#D97706" />
        <rect x="351" y="289" width="28" height="47" rx="14" fill="#FEF3C7" />
        <line x1="365" y1="205" x2="365" y2="185" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        <path d="M365 185 L378 190 L365 195 Z" fill="#EF4444" />

        {/* Small bouncy cube (left) */}
        <rect x="42" y="255" width="90" height="85" rx="6" fill="#10B981" />
        <rect x="42" y="255" width="14" height="85" rx="3" fill="#059669" />
        <rect x="118" y="255" width="14" height="85" rx="3" fill="#059669" />
        <path d="M37 260 Q87 215 137 260 Z" fill="#34D399" />
        <path d="M45 260 Q87 222 129 260 Z" fill="#6EE7B7" />
        <path d="M62 242 Q87 228 112 242" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <rect x="72" y="292" width="30" height="48" rx="15" fill="#059669" />
        <rect x="76" y="296" width="22" height="40" rx="11" fill="#D1FAE5" />
        <line x1="87" y1="215" x2="87" y2="196" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <path d="M87 196 L100 201 L87 206 Z" fill="#F59E0B" />

        {/* Floating tickets */}
        <g transform="translate(58, 80) rotate(-12)">
          <rect width="60" height="30" rx="6" fill="#0066FF" />
          <circle cx="0" cy="15" r="7" fill="#F0F6FF" />
          <circle cx="60" cy="15" r="7" fill="#F0F6FF" />
          <line x1="9" y1="15" x2="51" y2="15" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
          <rect x="14" y="8" width="22" height="5" rx="2.5" fill="white" opacity="0.8" />
          <rect x="14" y="17" width="14" height="4" rx="2" fill="white" opacity="0.5" />
        </g>
        <g transform="translate(360, 60) rotate(8)">
          <rect width="56" height="28" rx="6" fill="#7C3AED" />
          <circle cx="0" cy="14" r="6" fill="#F0F6FF" />
          <circle cx="56" cy="14" r="6" fill="#F0F6FF" />
          <line x1="8" y1="14" x2="48" y2="14" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
          <rect x="12" y="7" width="20" height="5" rx="2.5" fill="white" opacity="0.8" />
        </g>

        {/* Stars / sparkles */}
        <circle cx="80" cy="160" r="4" fill="#FCD34D" />
        <circle cx="400" cy="155" r="3" fill="#FCA5A5" />
        <circle cx="440" cy="200" r="4" fill="#FCD34D" />
        <circle cx="50" cy="210" r="3" fill="#A5B4FC" />
        <path d="M88 155 L90 148 L92 155 L99 157 L92 159 L90 166 L88 159 L81 157 Z" fill="#FCD34D" />
        <path d="M405 148 L407 143 L409 148 L414 150 L409 152 L407 157 L405 152 L400 150 Z" fill="#FCA5A5" />

        {/* Confetti dots */}
        {[
          [170, 95, "#FCD34D"], [200, 75, "#F87171"], [230, 90, "#60A5FA"],
          [260, 78, "#34D399"], [290, 95, "#A78BFA"], [155, 110, "#FB923C"],
        ].map(([cx, cy, fill], i) => (
          <circle key={i} cx={cx as number} cy={cy as number} r="4" fill={fill as string} />
        ))}

        {/* Kid in castle doorway */}
        <circle cx="220" cy="302" r="9" fill="#FDE68A" />
        <rect x="213" y="311" width="14" height="18" rx="4" fill="#EF4444" />

        {/* Crowd dots at base */}
        {[140, 165, 195, 250, 272, 300].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={342} r="7" fill={["#FDE68A", "#FECACA", "#BBF7D0", "#BAE6FD", "#DDD6FE", "#FEF08A"][i]} />
            <rect x={x - 5} y={349} width="10" height="12" rx="3" fill={["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][i]} />
          </g>
        ))}
      </svg>

      <div className="relative z-10 text-center mt-4">
        <p className="text-sm font-semibold text-blue-900/60">The platform behind America&apos;s biggest bounce events</p>
      </div>
    </div>
  );
}

export default function OrganizerAuthPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      router.replace("/organizer");
      return;
    }
    // Mount-only check of localStorage-backed session state; it can't be
    // read during SSR, so this is the earliest point it can be resolved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [router]);

  // signup first, then on success auto-transition to login, login success → dashboard
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [signupSuccess, setSignupSuccess] = useState(false);

  // signup fields — matches payload: email, password1, password2
  const [suEmail, setSuEmail] = useState("");
  const [suPw1, setSuPw1] = useState("");
  const [suPw2, setSuPw2] = useState("");
  const [showSuPw1, setShowSuPw1] = useState(false);
  const [showSuPw2, setShowSuPw2] = useState(false);

  // login fields — matches payload: email, password
  const [liEmail, setLiEmail] = useState("");
  const [liPw, setLiPw] = useState("");
  const [showLiPw, setShowLiPw] = useState(false);

  // forgot password (unchanged mock — not part of the API integration scope)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  function switchTab(tab: "signup" | "login") {
    setMode(tab);
    setForgotOpen(false);
    setForgotSent(false);
    setSignupSuccess(false);
    setError(null);
    setFieldErrors({});
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});

    const requiredErrors: Record<string, string> = {};
    if (!suEmail.trim()) requiredErrors.suEmail = "Required";
    if (!suPw1) requiredErrors.suPw1 = "Required";
    if (!suPw2) requiredErrors.suPw2 = "Required";
    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors);
      return;
    }

    if (suPw1 !== suPw2) {
      setError("Passwords does not match");
      return;
    }

    setSubmitting(true);
    try {
      await registerOrganizer({ email: suEmail, password1: suPw1, password2: suPw2 });
      setSignupSuccess(true);
      const registeredEmail = suEmail;
      setTimeout(() => {
        setSignupSuccess(false);
        setMode("login");
        setLiEmail(registeredEmail);
        setSuEmail("");
        setSuPw1("");
        setSuPw2("");
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});

    const requiredErrors: Record<string, string> = {};
    if (!liEmail.trim()) requiredErrors.liEmail = "Required";
    if (!liPw) requiredErrors.liPw = "Required";
    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginOrganizer({ email: liEmail, password: liPw });
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      router.push("/organizer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid credentials.");
      setSubmitting(false);
    }
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotSent(true);
  }

  if (!checked) return null;

  return (
    <div className="min-h-screen flex bg-white">
      <LeftPanel />

      {/* Right: form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-white relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Lock size={14} className="text-white" />
          </div>
          <div className="text-sm font-black font-(family-name:--font-display)">Big Bounce America</div>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Tab switcher */}
          <div className="flex bg-secondary rounded-xl p-1 mb-7 gap-1">
            {(["signup", "login"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === tab ? "bg-primary text-white shadow-[0_2px_12px_rgba(0,102,255,0.35)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "signup" ? "Sign Up" : "Sign In"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-black mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "signup"
                ? "Enter your email and choose a password to get started."
                : "Sign in to your organizer account to continue."}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          {/* ── SIGNUP FORM ── */}
          {mode === "signup" &&
            (signupSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle size={22} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-700 font-(family-name:--font-display)">
                    Account Created!
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Redirecting you to sign in…</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <InputField
                  label="Email Address"
                  id="su-email"
                  type="email"
                  placeholder="you@organization.com"
                  value={suEmail}
                  onChange={setSuEmail}
                  icon={Mail}
                  error={fieldErrors.suEmail}
                />
                <InputField
                  label="Password"
                  id="su-pw1"
                  type={showSuPw1 ? "text" : "password"}
                  placeholder="••••••••"
                  value={suPw1}
                  onChange={setSuPw1}
                  icon={Lock}
                  rightSlot={eyeBtn(showSuPw1, () => setShowSuPw1((p) => !p))}
                  error={fieldErrors.suPw1}
                />
                <InputField
                  label="Confirm Password"
                  id="su-pw2"
                  type={showSuPw2 ? "text" : "password"}
                  placeholder="••••••••"
                  value={suPw2}
                  onChange={setSuPw2}
                  icon={Lock}
                  rightSlot={eyeBtn(showSuPw2, () => setShowSuPw2((p) => !p))}
                  error={fieldErrors.suPw2}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 24px rgba(0,102,255,0.35)" }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" /> Creating Account…
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center pt-1">
                  By signing up you agree to our{" "}
                  <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> and{" "}
                  <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
                </p>
              </form>
            ))}

          {/* ── LOGIN FORM ── */}
          {mode === "login" &&
            (forgotOpen ? (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
                    <Lock size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-(family-name:--font-display)">Reset Password</div>
                    <div className="text-xs text-muted-foreground">We&apos;ll send a reset link to your inbox.</div>
                  </div>
                </div>
                {forgotSent ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 flex items-start gap-2.5">
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Reset link sent to <strong>{forgotEmail}</strong>. Check your inbox.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <InputField
                      label="Email address"
                      id="forgot-email"
                      type="email"
                      placeholder="you@organization.com"
                      value={forgotEmail}
                      onChange={setForgotEmail}
                      icon={Mail}
                    />
                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl py-2.5 transition-colors"
                    >
                      Send Reset Link
                    </button>
                  </form>
                )}
                <button
                  onClick={() => {
                    setForgotOpen(false);
                    setForgotSent(false);
                    setForgotEmail("");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="Email Address"
                  id="li-email"
                  type="email"
                  placeholder="you@organization.com"
                  value={liEmail}
                  onChange={setLiEmail}
                  icon={Mail}
                  error={fieldErrors.liEmail}
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="li-pw" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="li-pw"
                      type={showLiPw ? "text" : "password"}
                      value={liPw}
                      onChange={(e) => setLiPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiPw((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLiPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {fieldErrors.liPw && <p className="text-xs text-red-500">{fieldErrors.liPw}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 24px rgba(0,102,255,0.35)" }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" /> Signing in…
                    </span>
                  ) : (
                    "Sign In to Organizer Portal"
                  )}
                </button>
              </form>
            ))}

          {/* Social proof footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Trusted by <span className="text-foreground font-semibold">1,200+</span> event organizers across the US
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
