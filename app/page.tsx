"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Eye, EyeOff, Lock, Mail, Percent, Ticket, Users, Zap } from "lucide-react";
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
import { Check, Monitor, Settings } from "lucide-react";
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

export default function RoleSelectorPage() {
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
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ElementType;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-secondary-foreground tracking-wide uppercase">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon size={15} />
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-secondary/60 border border-border rounded-xl py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all"
          style={{ paddingLeft: Icon ? "2.5rem" : "0.875rem", paddingRight: rightSlot ? "2.75rem" : "0.875rem" }}
        />
        {rightSlot && <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    </div>
  );
}

function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative flex-col justify-between p-10 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #07102A 0%, #0C1C3E 40%, #112040 100%)" }}
    >
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)", transform: "translate(-30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #F97316 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.3) 39px,rgba(255,255,255,.3) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.3) 39px,rgba(255,255,255,.3) 40px)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-black tracking-tight font-(family-name:--font-display)">Big Bounce America</div>
          <div className="text-xs text-muted-foreground">Organizer Portal</div>
        </div>
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3.5 py-1 mb-6 text-accent text-xs font-semibold tracking-widest uppercase">
          Organizer Portal
        </div>
        <h2 className="text-3xl xl:text-4xl font-black leading-tight mb-4 text-foreground font-(family-name:--font-display)">
          Your events,
          <br />
          your platform.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          Create events, manage ticket types, run discount campaigns, build seat maps, and grow your team — all
          from one place.
        </p>
        <div className="mt-8 space-y-3">
          {[
            { icon: Calendar, label: "Event creation & publishing" },
            { icon: Ticket, label: "Ticket types & dynamic pricing" },
            { icon: Percent, label: "Discount codes & promotions" },
            { icon: Users, label: "Team access management" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-primary" />
              </div>
              <span className="text-xs text-secondary-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex gap-6">
        {[
          ["2,400+", "Events hosted"],
          ["$4.2M", "Revenue processed"],
          ["180K", "Tickets sold"],
        ].map(([v, l]) => (
          <div key={l}>
            <div className="text-lg font-black text-foreground font-(family-name:--font-display)">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
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

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  function switchTab(tab: "signup" | "login") {
    setMode(tab);
    setForgotOpen(false);
    setForgotSent(false);
    setSignupSuccess(false);
    setError(null);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

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
    <div className="min-h-screen bg-background flex">
      <LeftPanel />

      {/* Right: form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div className="text-sm font-black font-(family-name:--font-display)">Big Bounce America</div>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Tab switcher */}
          <div className="flex bg-secondary/60 rounded-xl p-1 mb-7 gap-1">
            {(["signup", "login"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === tab
                    ? "bg-primary text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "signup" ? "Sign Up" : "Sign In"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-black mb-1 text-foreground font-(family-name:--font-display)">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signup"
                ? "Enter your email and choose a password to get started."
                : "Sign in to your organizer account to continue."}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── SIGNUP FORM ── */}
          {mode === "signup" &&
            (signupSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400 font-(family-name:--font-display)">
                    Account Created!
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Redirecting you to sign in…</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* email */}
                <InputField
                  label="Email Address"
                  id="su-email"
                  type="email"
                  placeholder="you@organization.com"
                  value={suEmail}
                  onChange={setSuEmail}
                  icon={Mail}
                />
                {/* password1 */}
                <InputField
                  label="Password"
                  id="su-pw1"
                  type={showSuPw1 ? "text" : "password"}
                  placeholder="••••••••"
                  value={suPw1}
                  onChange={setSuPw1}
                  icon={Lock}
                  rightSlot={eyeBtn(showSuPw1, () => setShowSuPw1((p) => !p))}
                />
                {/* password2 */}
                <InputField
                  label="Confirm Password"
                  id="su-pw2"
                  type={showSuPw2 ? "text" : "password"}
                  placeholder="••••••••"
                  value={suPw2}
                  onChange={setSuPw2}
                  icon={Lock}
                  rightSlot={eyeBtn(showSuPw2, () => setShowSuPw2((p) => !p))}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none text-white font-bold text-sm rounded-xl py-3 transition-all mt-1 shadow-[0_4px_24px_rgba(37,99,235,0.35)]"
                >
                  {submitting ? "Creating Account…" : "Create Account"}
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
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lock size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-(family-name:--font-display)">Reset Password</div>
                    <div className="text-xs text-muted-foreground">We&apos;ll send a reset link to your inbox.</div>
                  </div>
                </div>
                {forgotSent ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-400 flex items-start gap-2.5">
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
                {/* email */}
                <InputField
                  label="Email Address"
                  id="li-email"
                  type="email"
                  placeholder="you@organization.com"
                  value={liEmail}
                  onChange={setLiEmail}
                  icon={Mail}
                />
                {/* password */}
                <div className="space-y-1">
                  <InputField
                    label="Password"
                    id="li-pw"
                    type={showLiPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={liPw}
                    onChange={setLiPw}
                    icon={Lock}
                    rightSlot={eyeBtn(showLiPw, () => setShowLiPw((p) => !p))}
                  />
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none text-white font-bold text-sm rounded-xl py-3 transition-all shadow-[0_4px_24px_rgba(37,99,235,0.35)]"
                >
                  {submitting ? "Signing In…" : "Sign In to Organizer Portal"}
                </button>
              </form>
            ))}

          {/* Social proof footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Trusted by <span className="text-foreground font-semibold">1,200+</span> event organizers across the
              US
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
