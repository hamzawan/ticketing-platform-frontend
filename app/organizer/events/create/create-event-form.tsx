"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, MapPin, Plus, Trash2, X } from "lucide-react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  createEvent,
  publishEvent,
  extractImageUrl,
  updateEvent,
  type CreateEventPayload,
  type OrganizerEvent,
} from "@/lib/api";
import { RichTextEditor } from "@/components/organizer/rich-text-editor";
import { ImageUploader, type UploadedImage } from "@/components/organizer/image-uploader";

type DraftSession = { id: string; date: string; startTime: string; endTime: string };
type DraftTicketType = { id: string; sessionId: string; name: string; price: string; qty: string };

const STEPS = ["Event Info", "Sessions", "Ticket Types", "Review"];

const inp =
  "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground";
const lbl = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block";

function parseAgeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

// The API returns times like "14:47:55.432000"; <input type="time"> only
// accepts "HH:MM" (or "HH:MM:SS"), so trim it down for the form field.
function toTimeInputValue(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

function fmtTime(t: string): string {
  if (!t) return "";
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function fmtDateShort(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateLong(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function newId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

export function CreateEventForm({
  eventId,
  initialEvent,
}: {
  eventId?: string;
  initialEvent?: OrganizerEvent;
} = {}) {
  const isEditMode = Boolean(eventId);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);

  const [form, setForm] = useState({
    name: initialEvent?.name ?? "",
    venue: initialEvent?.venue ?? "",
    city: initialEvent?.city ?? "",
    description: initialEvent?.description ?? "",
    address: initialEvent?.address ?? "",
    mapUrl: initialEvent?.map_url ?? "",
    minAge: initialEvent?.min_age != null ? String(initialEvent.min_age) : "",
    maxAge: initialEvent?.max_age != null ? String(initialEvent.max_age) : "",
  });

  const firstSessionId = "s0";
  const [sessions, setSessions] = useState<DraftSession[]>([
    {
      id: firstSessionId,
      date: initialEvent?.event_date ?? "",
      startTime: toTimeInputValue(initialEvent?.start_time),
      endTime: toTimeInputValue(initialEvent?.end_time),
    },
  ]);
  const [ticketTypes, setTicketTypes] = useState<DraftTicketType[]>(
    initialEvent?.ticket_types.length
      ? initialEvent.ticket_types.map((t) => ({
          id: newId("tt"),
          sessionId: firstSessionId,
          name: t.name,
          price: t.price,
          qty: String(t.quantity),
        }))
      : [],
  );
  const [expandedSess, setExpandedSess] = useState<string[]>([firstSessionId]);

  const existingImages = initialEvent?.images.map((img) => extractImageUrl(img)).filter((u): u is string => Boolean(u)) ?? [];
  const [images, setImages] = useState<UploadedImage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<OrganizerEvent | null>(initialEvent ?? null);

  const addSession = () => {
    const id = newId("s");
    setSessions((s) => [...s, { id, date: "", startTime: "", endTime: "" }]);
    setExpandedSess((e) => [...e, id]);
  };
  const removeSession = (id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
    setTicketTypes((t) => t.filter((x) => x.sessionId !== id));
    setExpandedSess((e) => e.filter((x) => x !== id));
  };
  const updateSession = (id: string, key: keyof DraftSession, val: string) =>
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, [key]: val } : x)));
  const toggleSess = (id: string) => setExpandedSess((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  const addTicketType = (sessionId: string) =>
    setTicketTypes((t) => [...t, { id: newId("tt"), sessionId, name: "", price: "", qty: "" }]);
  const removeTicketType = (id: string) => setTicketTypes((t) => t.filter((x) => x.id !== id));
  const updateTicketType = (id: string, key: keyof DraftTicketType, val: string) =>
    setTicketTypes((t) => t.map((x) => (x.id === id ? { ...x, [key]: val } : x)));

  const totalRevEstimate = ticketTypes.reduce((sum, t) => sum + (parseFloat(t.price) || 0) * (parseInt(t.qty) || 0), 0);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateForm(): string | null {
    if (!form.name.trim() || !form.venue.trim()) return "Event name and venue are required.";
    const first = sessions[0];
    const hasTickets = ticketTypes.some((t) => t.name.trim());
    if (hasTickets && (!first?.date || !first?.startTime || !first?.endTime)) {
      return "The first session's date, start time, and end time are required when ticket types are added.";
    }
    return null;
  }

  function buildPayload(): CreateEventPayload {
    const validTickets = ticketTypes.filter((t) => t.name.trim());
    const first = sessions[0];
    // The API rejects requests that send both `ticket_types` and
    // `sessions` ("Provide either sessions or ticket_types") — with more
    // than one session, all ticket types travel nested inside `sessions`
    // instead, and the flat top-level `ticket_types` field is omitted.
    const isMultiSession = sessions.length > 1;
    return {
      name: form.name.trim(),
      venue: form.venue.trim(),
      event_date: first?.date || null,
      start_time: first?.startTime || null,
      end_time: first?.endTime || null,
      ticket_types:
        !isMultiSession && validTickets.length
          ? JSON.stringify(validTickets.map((t) => ({ name: t.name.trim(), price: t.price, quantity: Number(t.qty) || 0 })))
          : null,
      sessions: isMultiSession
        ? JSON.stringify(
            sessions.map((s) => ({
              session_date: s.date,
              start_time: s.startTime,
              end_time: s.endTime,
              ticket_types: ticketTypes
                .filter((t) => t.sessionId === s.id && t.name.trim())
                .map((t) => ({ name: t.name.trim(), price: t.price, quantity: Number(t.qty) || 0 })),
            })),
          )
        : null,
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      map_url: form.mapUrl.trim() || null,
      min_age: parseAgeInput(form.minAge),
      max_age: parseAgeInput(form.maxAge),
      images: images.map((img) => img.file),
    };
  }

  function getAccessToken(): string | null {
    return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
  }

  async function handleSaveDraft() {
    if (submitting || savingDraft) return;
    setError(null);
    if (!form.name.trim() || !form.venue.trim()) {
      setError("Event name and venue are required to save a draft.");
      return;
    }
    setSavingDraft(true);
    try {
      if (createdEvent) {
        await updateEvent(createdEvent.id, buildPayload(), getAccessToken());
      } else {
        const created = await createEvent(buildPayload(), getAccessToken());
        setCreatedEvent(created);
      }
      router.push("/organizer/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleCreateEvent() {
    if (submitting) return;
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const created = await createEvent(buildPayload(), getAccessToken());
      setCreatedEvent(created);
      setStep(4);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function goToReviewStep() {
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(4);
  }

  async function handlePublishEvent() {
    if (submitting || !createdEvent) return;
    setError(null);
    setSubmitting(true);
    try {
      const publishedEvent = await publishEvent(createdEvent.id, getAccessToken());
      setCreatedEvent(publishedEvent);
      setPublished(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEvent() {
    if (submitting || !eventId) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateEvent(eventId, buildPayload(), getAccessToken());
      setCreatedEvent(updated);
      setPublished(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (published) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <Check size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black font-(family-name:--font-display)">{isEditMode ? "Event Updated!" : "Event Published!"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? `${createdEvent?.name || form.name || "Your event"} has been updated successfully.`
              : `${createdEvent?.name || form.name || "Your event"} is now live and ready to sell tickets.`}
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar with stepper */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-border flex-shrink-0 bg-card">
        <button
          onClick={() => router.push("/organizer/events")}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to My Events"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm leading-tight font-(family-name:--font-display)">
            {isEditMode ? "Edit Event" : "Create New Event"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === i + 1 ? "bg-primary text-white" : step > i + 1 ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > i + 1 && <Check size={10} />}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={10} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-5">
          {/* ── STEP 1: Event Info ── */}
          {step === 1 && (
            <>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold font-(family-name:--font-display)">Event Information</h3>
                <div>
                  <label className={lbl}>Event Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Big Bounce America — Houston"
                    className={inp}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Venue</label>
                    <input
                      value={form.venue}
                      onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                      placeholder="e.g. Houston Bounce Arena"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>City</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Houston, TX"
                      className={inp}
                    />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                    placeholder="Tell attendees what makes this event special — highlights, age groups, what to bring…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Min Age (optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.minAge}
                      onChange={(e) => setForm((f) => ({ ...f, minAge: e.target.value }))}
                      placeholder="e.g. 3"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Max Age (optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxAge}
                      onChange={(e) => setForm((f) => ({ ...f, maxAge: e.target.value }))}
                      placeholder="e.g. 12"
                      className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* Location card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2 font-(family-name:--font-display)">
                    <MapPin size={14} className="text-primary" /> Location Pin
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add a full street address and paste a Google Maps embed link to show a map on your event page.
                  </p>
                </div>
                <div>
                  <label className={lbl}>Full Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. 8000 Kirby Dr, Houston, TX 77054"
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Google Maps Embed URL</label>
                  <input
                    value={form.mapUrl}
                    onChange={(e) => setForm((f) => ({ ...f, mapUrl: e.target.value }))}
                    placeholder="https://maps.google.com/maps?q=...&output=embed"
                    className={inp}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    In Google Maps, click <span className="font-semibold">Share → Embed a map</span>, copy the{" "}
                    <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">src</code> value from the HTML snippet, and paste it here.
                  </p>
                </div>
                {form.mapUrl ? (
                  <div className="rounded-xl overflow-hidden border border-border" style={{ height: 220 }}>
                    <iframe
                      src={form.mapUrl}
                      width="100%"
                      height="220"
                      style={{ border: 0, display: "block" }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Map preview"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center gap-2 py-8">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                      <MapPin size={16} className="text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Map preview will appear here once you add an embed URL.</p>
                  </div>
                )}
              </div>

              {/* Images card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <div>
                  <h3 className="font-bold text-sm font-(family-name:--font-display)">Event Images</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {existingImages.length > 0
                      ? "Upload photos for your event listing. The first new image becomes the cover."
                      : "Upload photos for your event listing. The first image is used as the cover."}
                  </p>
                </div>
                {existingImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {existingImages.map((url) => (
                      <div key={url} className="rounded-xl overflow-hidden bg-secondary aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Current event" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <ImageUploader images={images} onChange={setImages} />
              </div>

              <div className="flex items-center justify-between gap-3">
                {!isEditMode && (
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="flex items-center gap-2 border border-border text-muted-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {savingDraft ? "Saving…" : "Save as Draft"}
                  </button>
                )}
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm ml-auto"
                >
                  Next: Sessions <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Sessions ── */}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Add every date and time slot for this event. Each entry is one bookable session customers will choose from.
              </p>
              <div className="space-y-3">
                {sessions.map((s, idx) => (
                  <div key={s.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Session {idx + 1}
                        {s.date ? ` — ${fmtDateShort(s.date)}` : ""}
                      </span>
                      {sessions.length > 1 && (
                        <button onClick={() => removeSession(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={lbl}>Date</label>
                        <input type="date" value={s.date} onChange={(e) => updateSession(s.id, "date", e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Start Time</label>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => updateSession(s.id, "startTime", e.target.value)}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={lbl}>End Time</label>
                        <input type="time" value={s.endTime} onChange={(e) => updateSession(s.id, "endTime", e.target.value)} className={inp} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addSession}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus size={14} /> Add Another Session
              </button>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 border border-border font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  {!isEditMode && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="flex items-center gap-2 border border-border text-muted-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {savingDraft ? "Saving…" : "Save as Draft"}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    sessions.forEach((s) => {
                      if (!ticketTypes.some((t) => t.sessionId === s.id)) addTicketType(s.id);
                    });
                    setExpandedSess(sessions.map((s) => s.id));
                    setStep(3);
                  }}
                  className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm"
                >
                  Next: Ticket Types <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Ticket Types ── */}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Configure ticket names, prices, and quantities for each session. Sessions can have different types.
              </p>

              {totalRevEstimate > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-primary font-semibold">Estimated max revenue</span>
                  <span className="text-lg font-bold text-primary font-(family-name:--font-display)">
                    ${totalRevEstimate.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {sessions.map((s, idx) => {
                  const sessTickets = ticketTypes.filter((t) => t.sessionId === s.id);
                  const isExpanded = expandedSess.includes(s.id);
                  const sessLabel = s.date
                    ? `${fmtDateShort(s.date)}${s.startTime ? `  ·  ${fmtTime(s.startTime)} → ${fmtTime(s.endTime)}` : ""}`
                    : `Session ${idx + 1}`;
                  const sessEst = sessTickets.reduce((sum, t) => sum + (parseFloat(t.price) || 0) * (parseInt(t.qty) || 0), 0);
                  return (
                    <div key={s.id} className={`border rounded-2xl overflow-hidden transition-colors bg-card ${isExpanded ? "border-primary/30" : "border-border"}`}>
                      <button onClick={() => toggleSess(s.id)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/20 transition-colors text-left">
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold leading-tight font-(family-name:--font-display)">{sessLabel}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sessTickets.length > 0 ? `${sessTickets.length} ticket type${sessTickets.length !== 1 ? "s" : ""}` : "No ticket types yet"}
                          </div>
                        </div>
                        {sessEst > 0 && <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">Est. ${sessEst.toLocaleString()}</span>}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border">
                          {sessTickets.length > 0 && (
                            <div className="px-5 pt-4 space-y-2">
                              <div className="hidden sm:grid grid-cols-[1fr_90px_90px_32px] gap-3">
                                {["Ticket Name", "Price", "Qty", ""].map((h) => (
                                  <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {h}
                                  </span>
                                ))}
                              </div>
                              {sessTickets.map((tt) => (
                                <div key={tt.id} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_32px] gap-3 items-center">
                                  <input
                                    value={tt.name}
                                    onChange={(e) => updateTicketType(tt.id, "name", e.target.value)}
                                    placeholder="e.g. General Admission"
                                    className="col-span-2 sm:col-span-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                                  />
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">$</span>
                                    <input
                                      value={tt.price}
                                      onChange={(e) => updateTicketType(tt.id, "price", e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-background border border-border rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  <input
                                    value={tt.qty}
                                    onChange={(e) => updateTicketType(tt.id, "qty", e.target.value)}
                                    placeholder="100"
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                                  />
                                  <button
                                    onClick={() => removeTicketType(tt.id)}
                                    className="text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center"
                                    aria-label="Remove ticket type"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="px-5 py-4">
                            <button onClick={() => addTicketType(s.id)} className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline transition-colors">
                              <Plus size={11} /> Add Ticket Type
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{error}</div>}

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 border border-border font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  {!isEditMode && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="flex items-center gap-2 border border-border text-muted-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {savingDraft ? "Saving…" : "Save as Draft"}
                    </button>
                  )}
                </div>
                <button
                  onClick={isEditMode ? goToReviewStep : handleCreateEvent}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isEditMode ? "Review Changes" : submitting ? "Creating…" : "Review & Publish"} <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4: Review ── */}
          {step === 4 && (
            <>
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-(family-name:--font-display)">Event Information</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline transition-colors">
                    Edit
                  </button>
                </div>
                <div>
                  <div className="text-base font-bold font-(family-name:--font-display)">
                    {form.name || <span className="text-muted-foreground font-normal italic text-sm">No name set</span>}
                  </div>
                  {(form.venue || form.city) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin size={11} />
                      {[form.venue, form.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {form.description && form.description !== "<p></p>" && (
                    <div
                      className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: form.description }}
                    />
                  )}
                  {form.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      {form.address}
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {images.slice(0, 4).map((img) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={img.id} src={img.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                      ))}
                      {images.length > 4 && <span className="text-xs text-muted-foreground">+{images.length - 4} more</span>}
                    </div>
                  )}
                </div>
              </div>

              {form.mapUrl && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-primary" />
                      <span className="text-sm font-bold font-(family-name:--font-display)">Location Map</span>
                    </div>
                    <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline transition-colors">
                      Edit
                    </button>
                  </div>
                  <div style={{ height: 200 }}>
                    <iframe
                      src={form.mapUrl}
                      width="100%"
                      height="200"
                      style={{ border: 0, display: "block" }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Location map"
                    />
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-bold font-(family-name:--font-display)">
                    Sessions &amp; Ticket Types
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                    </span>
                  </h3>
                  <button onClick={() => setStep(2)} className="text-xs text-primary hover:underline transition-colors">
                    Edit
                  </button>
                </div>
                {sessions.map((s, idx) => {
                  const sessTickets = ticketTypes.filter((t) => t.sessionId === s.id);
                  const dateLabel = s.date ? fmtDateLong(s.date) : `Session ${idx + 1}`;
                  const timeLabel = s.startTime ? `${fmtTime(s.startTime)} → ${fmtTime(s.endTime)}` : "No time set";
                  const sessEst = sessTickets.reduce((sum, t) => sum + (parseFloat(t.price) || 0) * (parseInt(t.qty) || 0), 0);
                  return (
                    <div key={s.id} className="border-b border-border last:border-0">
                      <div className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <div className="text-sm font-semibold">{dateLabel}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{timeLabel}</div>
                        </div>
                        {sessEst > 0 && <span className="text-xs font-bold text-muted-foreground">Est. ${sessEst.toLocaleString()}</span>}
                      </div>
                      {sessTickets.length > 0 ? (
                        <div className="px-5 pb-4 space-y-1.5">
                          {sessTickets
                            .filter((tt) => tt.name)
                            .map((tt) => (
                              <div key={tt.id} className="flex items-center justify-between bg-background rounded-lg px-4 py-2.5">
                                <span className="text-xs font-medium">{tt.name}</span>
                                <div className="flex items-center gap-5 text-xs text-muted-foreground">
                                  <span>{tt.qty || "0"} tickets</span>
                                  <span className="font-semibold text-foreground w-10 text-right">{tt.price ? `$${tt.price}` : "Free"}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="px-5 pb-4 text-xs text-muted-foreground italic">No ticket types configured</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalRevEstimate > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-emerald-700">Total Estimated Revenue</div>
                    <div className="text-xs text-muted-foreground mt-0.5">If all tickets sell at full price</div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-(family-name:--font-display)">
                    ${totalRevEstimate.toLocaleString()}
                  </div>
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{error}</div>}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 border border-border font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-2">
                  {!isEditMode && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="flex items-center gap-2 border border-border text-muted-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {savingDraft ? "Saving…" : "Save as Draft"}
                    </button>
                  )}
                  <button
                    onClick={isEditMode ? handleUpdateEvent : createdEvent ? handlePublishEvent : handleCreateEvent}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <Check size={14} />
                    {isEditMode ? (submitting ? "Saving…" : "Save Changes") : submitting ? "Publishing…" : "Publish Event"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
