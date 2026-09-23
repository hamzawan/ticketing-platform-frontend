"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

type TicketDraft = { name: string; price: string; quantity: string };

const STEPS = ["Event Details", "Ticket Types", "Review & Publish"];

const DETAIL_FIELDS: { label: string; key: "name" | "venue" | "city"; placeholder: string }[] = [
  { label: "Event Name", key: "name", placeholder: "e.g. Summer Bounce Bash" },
  { label: "Venue", key: "venue", placeholder: "e.g. Houston Bounce Arena" },
  { label: "City", key: "city", placeholder: "e.g. Houston, TX" },
];

export function CreateEventForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", time: "", venue: "", city: "", description: "" });
  const [tickets, setTickets] = useState<TicketDraft[]>([{ name: "General Admission", price: "", quantity: "" }]);

  const addTicket = () => setTickets((t) => [...t, { name: "", price: "", quantity: "" }]);
  const removeTicket = (i: number) => setTickets((t) => t.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, patch: Partial<TicketDraft>) =>
    setTickets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  if (published) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Check size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-black font-(family-name:--font-display)">Event Published!</h2>
          <p className="text-sm text-muted-foreground">
            {form.name || "Your event"} is now live and ready to sell tickets.
          </p>
          <button
            onClick={() => router.push("/organizer/events")}
            className="bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Go to My Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/organizer/events")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to My Events"
        >
          <ArrowLeft size={18} />
        </button>
        <PageHeader title="Create New Event" subtitle="Fill in the details to publish your event." />
      </div>

      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step > i + 1
                    ? "bg-emerald-500 text-white"
                    : step === i + 1
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > i + 1 ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={`hidden sm:inline text-xs font-medium ${
                  step === i + 1 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-3 ${step > i + 1 ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold font-(family-name:--font-display)">Event Details</h3>
          {DETAIL_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {f.label}
              </label>
              <input
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Start Time
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe your event..."
              rows={3}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground resize-none"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Continue to Ticket Types →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold font-(family-name:--font-display)">Ticket Types</h3>
          <div className="space-y-3">
            {tickets.map((t, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ticket Type {i + 1}
                  </span>
                  {tickets.length > 1 && (
                    <button
                      onClick={() => removeTicket(i)}
                      className="text-muted-foreground hover:text-red-400"
                      aria-label="Remove ticket type"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <input
                      value={t.name}
                      onChange={(e) => updateTicket(i, { name: e.target.value })}
                      placeholder="Name (e.g. General Admission)"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <input
                      value={t.price}
                      onChange={(e) => updateTicket(i, { price: e.target.value })}
                      placeholder="Price ($)"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <input
                      value={t.quantity}
                      onChange={(e) => updateTicket(i, { quantity: e.target.value })}
                      placeholder="Quantity"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addTicket}
            className="w-full border border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add Another Ticket Type
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-border font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Review & Publish →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="font-bold font-(family-name:--font-display)">Review &amp; Publish</h3>
          <div className="bg-background border border-border rounded-xl p-4 space-y-2">
            <div className="text-sm font-semibold">{form.name || "Untitled Event"}</div>
            <div className="text-xs text-muted-foreground">
              {form.venue}
              {form.city ? `, ${form.city}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {form.date} {form.time && `· ${form.time}`}
            </div>
            {form.description && <div className="text-xs text-muted-foreground">{form.description}</div>}
          </div>
          <div className="space-y-2">
            {tickets
              .filter((t) => t.name)
              .map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3"
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{t.quantity || "—"} available</span>
                    <span className="font-semibold text-foreground">{t.price ? `$${t.price}` : "Free"}</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-border font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => setPublished(true)}
              className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-600 transition-colors text-sm"
            >
              ✓ Publish Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
