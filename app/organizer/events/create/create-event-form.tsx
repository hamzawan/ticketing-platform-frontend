"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  createEvent,
  publishEvent,
  type CreateEventPayload,
  type OrganizerEvent,
} from "@/lib/api";

type TicketDraft = { name: string; price: string; quantity: string };

function parseAgeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

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
  const [form, setForm] = useState({
    name: "",
    date: "",
    time: "",
    endTime: "",
    venue: "",
    city: "",
    description: "",
    minAge: "",
    maxAge: "",
  });
  const [tickets, setTickets] = useState<TicketDraft[]>([{ name: "General Admission", price: "", quantity: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<OrganizerEvent | null>(null);

  const addTicket = () => setTickets((t) => [...t, { name: "", price: "", quantity: "" }]);
  const removeTicket = (i: number) => setTickets((t) => t.filter((_, idx) => idx !== i));
  const updateTicket = (i: number, patch: Partial<TicketDraft>) =>
    setTickets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  // Revoke the object URL used for the preview whenever it changes or the
  // form unmounts, so we don't leak blob URLs.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  // "Review & Publish" (step 2 → 3): creates the event via the Create API,
  // but does not publish it. The returned event's id is stored and reused
  // by handlePublishEvent — the Create API is never called again from there.
  async function handleCreateEvent() {
    if (submitting) return;
    setError(null);

    if (!form.name.trim() || !form.venue.trim()) {
      setError("Event name and venue are required.");
      return;
    }

    const validTickets = tickets.filter((t) => t.name.trim());

    if (validTickets.length > 0 && (!form.date || !form.time || !form.endTime)) {
      setError("Event Date, Start Time, and End Time are required when ticket types are added.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateEventPayload = {
        name: form.name.trim(),
        venue: form.venue.trim(),
        event_date: form.date || null,
        start_time: form.time || null,
        end_time: form.endTime || null,
        ticket_types: validTickets.length
          ? JSON.stringify(
              validTickets.map((t) => ({
                name: t.name.trim(),
                price: t.price,
                quantity: Number(t.quantity) || 0,
              })),
            )
          : null,
        sessions: null,
        description: form.description.trim() || null,
        city: form.city.trim() || null,
        min_age: parseAgeInput(form.minAge),
        max_age: parseAgeInput(form.maxAge),
        images: imageFile ? [imageFile] : [],
      };

      const token =
        typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      const created = await createEvent(payload, token);
      setCreatedEvent(created);
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // "Publish Event" (step 3): publishes the already-created event by id.
  async function handlePublishEvent() {
    if (submitting || !createdEvent) return;
    setError(null);
    setSubmitting(true);
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      const publishedEvent = await publishEvent(createdEvent.id, token);
      setCreatedEvent(publishedEvent);
      setPublished(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (published) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Check size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-black font-(family-name:--font-display)">Event Published!</h2>
          <p className="text-sm text-muted-foreground">
            {createdEvent?.name || form.name || "Your event"} is now live and ready to sell tickets.
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
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Event Image
            </label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Event preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="event-image"
                className="w-full border border-dashed border-border rounded-xl py-6 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <ImagePlus size={18} />
                Click to upload an image
              </label>
            )}
            <input id="event-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
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
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                End Time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Min Age
              </label>
              <input
                type="number"
                min={0}
                value={form.minAge}
                onChange={(e) => setForm((p) => ({ ...p, minAge: e.target.value }))}
                placeholder="e.g. 18"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Max Age
              </label>
              <input
                type="number"
                min={0}
                value={form.maxAge}
                onChange={(e) => setForm((p) => ({ ...p, maxAge: e.target.value }))}
                placeholder="e.g. 60"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
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
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={submitting}
              className="flex-1 border border-border font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
            >
              ← Back
            </button>
            <button
              onClick={handleCreateEvent}
              disabled={submitting}
              className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
            >
              {submitting ? "Creating…" : "Review & Publish →"}
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
              {form.endTime && ` – ${form.endTime}`}
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
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="flex-1 border border-border font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
            >
              ← Back
            </button>
            <button
              onClick={handlePublishEvent}
              disabled={submitting}
              className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-600 transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
            >
              {submitting ? "Publishing…" : "✓ Publish Event"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
