"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { isEmbedUrl, isShortUrl, MAP_URL_ERROR } from "@/lib/google-maps";
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
// Today in the user's local timezone as YYYY-MM-DD (matches <input type="date"> values).
function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  // Editing a draft: offer Publish alongside Save Changes, like the create flow.
  const isDraftEdit = isEditMode && initialEvent?.status === "draft";
  const [publishedFromDraft, setPublishedFromDraft] = useState(false);

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

  // Share links are swapped for their embed URL once resolved, so `form.mapUrl`
  // only ever holds something the preview iframe and the API can use.
  const [mapStatus, setMapStatus] = useState<{ resolving: boolean; error: string | null }>({ resolving: false, error: null });

  const latestMapInput = useRef(form.mapUrl);

  function handleMapUrlChange(value: string) {
    const v = value.trim();
    latestMapInput.current = value;
    setForm((f) => ({ ...f, mapUrl: value }));
    if (!v || isEmbedUrl(v)) return setMapStatus({ resolving: false, error: null });
    if (!isShortUrl(v)) return setMapStatus({ resolving: false, error: MAP_URL_ERROR });
    setMapStatus({ resolving: true, error: null });
    fetch(`/api/maps/resolve?url=${encodeURIComponent(v)}`)
      .then(async (res) => ({ ok: res.ok, data: (await res.json()) as { url?: string; error?: string } }))
      .catch(() => ({ ok: false, data: { error: "Couldn't resolve this link. Please try again." } as { url?: string; error?: string } }))
      .then(({ ok, data }) => {
        // Ignore the result if the user has edited the field since.
        if (latestMapInput.current !== value) return;
        setMapStatus({ resolving: false, error: ok && data.url ? null : (data.error ?? MAP_URL_ERROR) });
        if (ok && data.url) setForm((f) => ({ ...f, mapUrl: data.url! }));
      });
  }

  const [sessionError, setSessionError] = useState<string | null>(null);

  // The newest session must be complete and valid before another can be added.
  function getSessionError(s: DraftSession, idx: number): string | null {
    const missing = [!s.date && "date", !s.startTime && "start time", !s.endTime && "end time"].filter(Boolean);
    if (missing.length) return `Session ${idx + 1}: please enter the ${missing.join(", ")} before adding another session.`;
    if (s.date < todayInputValue() && !(idx === 0 && s.date === initialEvent?.event_date)) {
      return `Session ${idx + 1}: the date can't be in the past.`;
    }
    if (s.endTime <= s.startTime) return `Session ${idx + 1}: the end time must be after the start time.`;
    return null;
  }

  const addSession = () => {
    const last = sessions[sessions.length - 1];
    const lastError = last ? getSessionError(last, sessions.length - 1) : null;
    setSessionError(lastError);
    if (lastError) {
      markShown(2);
      return;
    }
    markShown(2, false);
    const id = newId("s");
    setSessions((s) => [...s, { id, date: "", startTime: "", endTime: "" }]);
    setExpandedSess((e) => [...e, id]);
  };
  const removeSession = (id: string) => {
    setSessionError(null);
    setSessions((s) => s.filter((x) => x.id !== id));
    setTicketTypes((t) => t.filter((x) => x.sessionId !== id));
    setExpandedSess((e) => e.filter((x) => x !== id));
  };
  const updateSession = (id: string, key: keyof DraftSession, val: string) => {
    setSessionError(null);
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, [key]: val } : x)));
  };
  const toggleSess = (id: string) => setExpandedSess((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  // Like addSession: the newest incomplete row blocks adding another and gets one short message
  // plus red borders on its bad fields (no per-field text).
  const [ticketAddError, setTicketAddError] = useState<string | null>(null);
  const [flaggedTickets, setFlaggedTickets] = useState<string[]>([]);
  const addTicketType = (sessionId: string) => {
    const rows = ticketTypes.filter((t) => t.sessionId === sessionId);
    const idx = rows.findIndex((t) => Object.keys(getTicketFieldErrors(t)).length > 0);
    if (idx >= 0) {
      const t = rows[idx];
      const errs = getTicketFieldErrors(t);
      const labels = { name: "name", price: "price", qty: "quantity" } as const;
      const keys = (Object.keys(errs) as (keyof typeof labels)[]);
      const empty = keys.filter((k) => !t[k].trim()).map((k) => labels[k]);
      const invalid = keys.filter((k) => t[k].trim()).map((k) => labels[k]);
      const parts = [empty.length && `enter the ${empty.join(", ")}`, invalid.length && `enter a valid ${invalid.join(", ")}`].filter(Boolean);
      setTicketAddError(`Ticket type ${idx + 1}: please ${parts.join(" and ")} before adding another ticket type.`);
      setFlaggedTickets((f) => [...f, t.id]);
      return;
    }
    setTicketAddError(null);
    setFlaggedTickets([]);
    setTicketTypes((t) => [...t, { id: newId("tt"), sessionId, name: "", price: "", qty: "" }]);
  };
  const removeTicketType = (id: string) => {
    setTicketAddError(null);
    setFlaggedTickets([]);
    setTicketTypes((t) => t.filter((x) => x.id !== id));
  };
  const updateTicketType = (id: string, key: keyof DraftTicketType, val: string) => {
    setTicketAddError(null);
    setTicketTypes((t) => t.map((x) => (x.id === id ? { ...x, [key]: val } : x)));
  };

  const totalRevEstimate = ticketTypes.reduce((sum, t) => sum + (parseFloat(t.price) || 0) * (parseInt(t.qty) || 0), 0);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A date left untouched on an event being edited is allowed even if it has passed.
  function getPastDateError(): string | null {
    const today = todayInputValue();
    const hasPast = sessions.some((s, i) => s.date && s.date < today && !(i === 0 && s.date === initialEvent?.event_date));
    return hasPast ? "Event dates can't be in the past. Choose today or a future date." : null;
  }

  // Each step validates only its own fields; errors show once that step's Next/submit was tried.
  const [showErrors, setShowErrors] = useState<Record<number, boolean>>({});
  // A field shows its own error once the user has left it (or after Next/submit was tried).
  const [touchedTickets, setTouchedTickets] = useState<Record<string, boolean>>({});
  const touchTicket = (id: string, key: string) => setTouchedTickets((p) => (p[`${id}:${key}`] ? p : { ...p, [`${id}:${key}`]: true }));
  const markShown = (step: number, on = true) => setShowErrors((p) => ({ ...p, [step]: on }));

  const infoErrors: { name?: string; venue?: string; minAge?: string; maxAge?: string; address?: string; map?: string } = {};
  if (!form.name.trim()) infoErrors.name = "Event name is required.";
  if (!form.venue.trim()) infoErrors.venue = "Venue is required.";
  const minAge = parseAgeInput(form.minAge);
  const maxAge = parseAgeInput(form.maxAge);
  if (form.minAge.trim() && (minAge === null || minAge < 0)) infoErrors.minAge = "Enter a valid age.";
  if (form.maxAge.trim() && (maxAge === null || maxAge < 0)) infoErrors.maxAge = "Enter a valid age.";
  else if (minAge !== null && maxAge !== null && maxAge < minAge) infoErrors.maxAge = "Max age can't be less than min age.";
  if (!form.address.trim()) infoErrors.address = "Full address is required.";
  if (!form.mapUrl.trim()) infoErrors.map = "Google Maps link is required.";
  else if (mapStatus.resolving) infoErrors.map = "Still resolving the Google Maps link — please wait a moment.";
  else if (mapStatus.error) infoErrors.map = mapStatus.error;

  function getSessionFieldErrors(s: DraftSession, idx: number): { date?: string; startTime?: string; endTime?: string } {
    const e: { date?: string; startTime?: string; endTime?: string } = {};
    if (!s.date) e.date = "Date is required.";
    else if (s.date < todayInputValue() && !(idx === 0 && s.date === initialEvent?.event_date)) e.date = "Date can't be in the past.";
    if (!s.startTime) e.startTime = "Start time is required.";
    if (!s.endTime) e.endTime = "End time is required.";
    else if (s.startTime && s.endTime <= s.startTime) e.endTime = "End time must be after the start time.";
    return e;
  }
  const sessionsInvalid = sessions.some((s, i) => Object.keys(getSessionFieldErrors(s, i)).length > 0);

  // Every ticket row must be complete — an added-but-empty row blocks the step until it is filled in or removed.
  function getTicketFieldErrors(t: DraftTicketType): { name?: string; price?: string; qty?: string } {
    const e: { name?: string; price?: string; qty?: string } = {};
    if (!t.name.trim()) e.name = "Ticket name is required.";
    // Greater than 0, no leading zeros ("05", "007"); "0.50" is fine. 0 is a real value, just not an allowed one.
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(t.price.trim()) || !(Number(t.price) > 0)) e.price = "Price must be above 0, e.g. 25 or 25.50.";
    if (!/^[1-9]\d*$/.test(t.qty.trim())) e.qty = "Quantity must be a whole number above 0, e.g. 100.";
    return e;
  }

  const sessionHasTicket = (sessionId: string) => ticketTypes.some((t) => t.sessionId === sessionId && t.name.trim());

  function getTicketsError(): string | null {
    const invalid = ticketTypes.filter((t) => Object.keys(getTicketFieldErrors(t)).length > 0);
    if (invalid.length) {
      // The last ticket type in a session can't be removed, so only offer "remove" when one can be.
      const removable = invalid.some((t) => ticketTypes.filter((x) => x.sessionId === t.sessionId).length > 1);
      return removable ? "Fill in or remove the highlighted ticket types." : "Fill in the highlighted ticket type.";
    }
    // The API rejects any session without ticket types ("sessions.N.ticket_types: List should have at least 1 item").
    const empty = sessions.map((s, i) => (sessionHasTicket(s.id) ? -1 : i)).filter((i) => i >= 0);
    if (empty.length) {
      return empty.length === 1 && sessions.length === 1
        ? "Add at least one ticket type."
        : `Add at least one ticket type to ${empty.map((i) => `Session ${i + 1}`).join(", ")}.`;
    }
    return null;
  }
  // Live, so the message disappears as soon as the problem is fixed.
  const ticketsError = showErrors[3] ? getTicketsError() : null;

  // Submit-time check: also expands sessions with missing or incomplete ticket types so the problem is visible.
  function validateTickets(): boolean {
    markShown(3);
    if (!getTicketsError()) return true;
    const hasBadRow = (id: string) => ticketTypes.some((t) => t.sessionId === id && Object.keys(getTicketFieldErrors(t)).length > 0);
    setExpandedSess((e) => Array.from(new Set([...e, ...sessions.filter((s) => !sessionHasTicket(s.id) || hasBadRow(s.id)).map((s) => s.id)])));
    return false;
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
          ? JSON.stringify(validTickets.map((t) => ({ name: t.name.trim(), price: t.price, quantity: Number(t.qty) })))
          : null,
      sessions: isMultiSession
        ? JSON.stringify(
            sessions.map((s) => ({
              session_date: s.date,
              start_time: s.startTime,
              end_time: s.endTime,
              ticket_types: ticketTypes
                .filter((t) => t.sessionId === s.id && t.name.trim())
                .map((t) => ({ name: t.name.trim(), price: t.price, quantity: Number(t.qty) })),
            })),
          )
        : null,
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      map_url: isEmbedUrl(form.mapUrl.trim()) ? form.mapUrl.trim() : null,
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
    const pastDateError = getPastDateError();
    if (pastDateError) {
      setError(pastDateError);
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
    if (!validateTickets()) return;
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
    if (!validateTickets()) return;
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

  async function handleUpdateAndPublish() {
    if (submitting || !eventId) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateEvent(eventId, buildPayload(), getAccessToken());
      const publishedEvent = await publishEvent(eventId, getAccessToken());
      setCreatedEvent(publishedEvent);
      setPublishedFromDraft(true);
      setPublished(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish event. Please try again.");
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
          <h2 className="text-xl font-black font-(family-name:--font-display)">{isEditMode && !publishedFromDraft ? "Event Updated!" : "Event Published!"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode && !publishedFromDraft
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
                    className={`${inp} ${showErrors[1] && infoErrors.name ? "border-red-400!" : ""}`}
                  />
                  {showErrors[1] && infoErrors.name && <p className="text-[11px] text-red-600 mt-1.5">{infoErrors.name}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Venue</label>
                    <input
                      value={form.venue}
                      onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                      placeholder="e.g. Houston Bounce Arena"
                      className={`${inp} ${showErrors[1] && infoErrors.venue ? "border-red-400!" : ""}`}
                    />
                    {showErrors[1] && infoErrors.venue && <p className="text-[11px] text-red-600 mt-1.5">{infoErrors.venue}</p>}
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
                      className={`${inp} ${showErrors[1] && infoErrors.minAge ? "border-red-400!" : ""}`}
                    />
                    {showErrors[1] && infoErrors.minAge && <p className="text-[11px] text-red-600 mt-1.5">{infoErrors.minAge}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Max Age (optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxAge}
                      onChange={(e) => setForm((f) => ({ ...f, maxAge: e.target.value }))}
                      placeholder="e.g. 12"
                      className={`${inp} ${showErrors[1] && infoErrors.maxAge ? "border-red-400!" : ""}`}
                    />
                    {showErrors[1] && infoErrors.maxAge && <p className="text-[11px] text-red-600 mt-1.5">{infoErrors.maxAge}</p>}
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
                    Both the full street address and a Google Maps link are required to show a map on your event page.
                  </p>
                </div>
                <div>
                  <label className={lbl}>Full Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. 8000 Kirby Dr, Houston, TX 77054"
                    className={`${inp} ${showErrors[1] && infoErrors.address ? "border-red-400!" : ""}`}
                  />
                  {showErrors[1] && infoErrors.address && <p className="text-[11px] text-red-600 mt-1.5">{infoErrors.address}</p>}
                </div>
                <div>
                  <label className={lbl}>Google Maps Link</label>
                  <input
                    value={form.mapUrl}
                    onChange={(e) => handleMapUrlChange(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className={`${inp} ${mapStatus.error || (showErrors[1] && infoErrors.map) ? "border-red-400!" : ""}`}
                  />
                  {mapStatus.error || (showErrors[1] && infoErrors.map) ? (
                    <p className="text-[11px] text-red-600 mt-1.5 leading-relaxed">{mapStatus.error ?? infoErrors.map}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      {mapStatus.resolving ? "Resolving link…" : <>In Google Maps, click <span className="font-semibold">Share → Copy link</span> and paste it here. The <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">src</code> of <span className="font-semibold">Embed a map</span> also works.</>}
                    </p>
                  )}
                </div>
                {isEmbedUrl(form.mapUrl.trim()) ? (
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
                  <div className="rounded-xl border border-dashed border-border bg-secondary/40 flex flex-col items-center justify-center gap-2 py-8 px-4">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                      <MapPin size={16} className="text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-xs text-balance">Map preview will appear here once you add a valid Google Maps link.</p>
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
                  onClick={() => {
                    markShown(1);
                    if (Object.keys(infoErrors).length > 0) return;
                    setStep(2);
                  }}
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
                {sessions.map((s, idx) => {
                  const fe = showErrors[2] ? getSessionFieldErrors(s, idx) : {};
                  return (
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
                        <input type="date" min={todayInputValue()} value={s.date} onChange={(e) => updateSession(s.id, "date", e.target.value)} className={`${inp} ${fe.date ? "border-red-400!" : ""}`} />
                        {fe.date && <p className="text-[11px] text-red-600 mt-1.5">{fe.date}</p>}
                      </div>
                      <div>
                        <label className={lbl}>Start Time</label>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => updateSession(s.id, "startTime", e.target.value)}
                          className={`${inp} ${fe.startTime ? "border-red-400!" : ""}`}
                        />
                        {fe.startTime && <p className="text-[11px] text-red-600 mt-1.5">{fe.startTime}</p>}
                      </div>
                      <div>
                        <label className={lbl}>End Time</label>
                        <input type="time" value={s.endTime} onChange={(e) => updateSession(s.id, "endTime", e.target.value)} className={`${inp} ${fe.endTime ? "border-red-400!" : ""}`} />
                        {fe.endTime && <p className="text-[11px] text-red-600 mt-1.5">{fe.endTime}</p>}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              {sessionError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{sessionError}</div>}
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
                    markShown(2);
                    if (sessionsInvalid) return;
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
                              {sessTickets.map((tt) => {
                                const all = getTicketFieldErrors(tt);
                                const shown = (k: "name" | "price" | "qty") => (showErrors[3] || touchedTickets[`${tt.id}:${k}`] ? all[k] : undefined);
                                const te = { name: shown("name"), price: shown("price"), qty: shown("qty") };
                                const flagged = flaggedTickets.includes(tt.id);
                                const bad = (k: boolean) => (k ? " border-red-400!" : "");
                                return (
                                <div key={tt.id}>
                                <div className="grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_32px] gap-3 items-center">
                                  <input
                                    value={tt.name}
                                    onChange={(e) => updateTicketType(tt.id, "name", e.target.value)}
                                    onBlur={() => touchTicket(tt.id, "name")}
                                    placeholder="e.g. General Admission"
                                    className={"col-span-2 sm:col-span-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" + bad(!!te.name || (flagged && !!all.name))}
                                  />
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">$</span>
                                    <input
                                      value={tt.price}
                                      onChange={(e) => updateTicketType(tt.id, "price", e.target.value)}
                                      onBlur={() => touchTicket(tt.id, "price")}
                                      placeholder="0"
                                      className={"w-full bg-background border border-border rounded-lg pl-6 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" + bad(!!te.price || (flagged && !!all.price))}
                                    />
                                  </div>
                                  <input
                                    value={tt.qty}
                                    onChange={(e) => updateTicketType(tt.id, "qty", e.target.value)}
                                    onBlur={() => touchTicket(tt.id, "qty")}
                                    placeholder="100"
                                    className={"w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" + bad(!!te.qty || (flagged && !!all.qty))}
                                  />
                                  <button
                                    onClick={() => removeTicketType(tt.id)}
                                    disabled={sessTickets.length <= 1}
                                    title={sessTickets.length <= 1 ? "Each session needs at least one ticket type" : undefined}
                                    className="text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                                    aria-label="Remove ticket type"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                                {/* One message at a time, in field order: name, then price, then quantity. */}
                                {(te.name ?? te.price ?? te.qty) && <p className="text-[11px] text-red-600 mt-1">{te.name ?? te.price ?? te.qty}</p>}
                                </div>
                                );
                              })}
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

              {(ticketAddError ?? ticketsError ?? error) && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{ticketAddError ?? ticketsError ?? error}</div>}

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

              {isEmbedUrl(form.mapUrl.trim()) && (
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
                  {isDraftEdit && (
                    <button
                      onClick={handleUpdateEvent}
                      disabled={submitting}
                      className="flex items-center gap-2 border border-border text-muted-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {submitting ? "Saving…" : "Save Changes"}
                    </button>
                  )}
                  <button
                    onClick={isDraftEdit ? handleUpdateAndPublish : isEditMode ? handleUpdateEvent : createdEvent ? handlePublishEvent : handleCreateEvent}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors text-sm disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <Check size={14} />
                    {isEditMode && !isDraftEdit ? (submitting ? "Saving…" : "Save Changes") : submitting ? "Publishing…" : "Publish Event"}
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
