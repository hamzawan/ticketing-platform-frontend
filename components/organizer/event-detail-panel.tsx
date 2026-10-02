"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ChevronDown, ChevronRight, Edit2, MapPin, Plus, Trash2, X, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  createSession,
  deleteTicketType,
  extractImageUrl,
  getEvent,
  saveEventSessions,
  updateTicketType,
  type EventTicketType,
  type OrganizerEvent,
  type SessionDraft,
} from "@/lib/api";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&h=400&fit=crop&auto=format";

type PanelSession = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  ticketTypes: EventTicketType[];
  // Readable code from the API (e.g. "ses-001").
  code: string | null;
  // Fallback display number (1, 2, 3…) when the API sends no code.
  displayNo: number;
  // false when the id is synthesised (no real session id from the API).
  persisted: boolean;
};

type Modal = { kind: "slot"; date: string } | { kind: "type"; sessionId: string } | { kind: "delete"; ticket: EventTicketType } | { kind: "edit"; ticket: EventTicketType };

const inp =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground";
const lbl = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block";

function toDraft(s: PanelSession): SessionDraft {
  return {
    ...(s.persisted ? { id: s.id } : {}),
    date: s.date,
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    ticketTypes: s.ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
    })),
  };
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? "00"} ${period}`;
}

function fmtDateLong(d: string): string {
  const date = new Date(`${d}T12:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

// The API's `sessions` array is loosely typed; fall back to the event's own
// date/time/ticket types when it's empty or unrecognisable.
export function getSessions(event: OrganizerEvent): PanelSession[] {
  const fallback: PanelSession = {
    id: event.id,
    date: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    ticketTypes: event.ticket_types,
    code: null,
    displayNo: 1,
    persisted: false,
  };
  if (!Array.isArray(event.sessions) || event.sessions.length === 0) return [fallback];

  return event.sessions.map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const id = asString(s.id) ?? `session-${i}`;
    const nested = Array.isArray(s.ticket_types) ? (s.ticket_types as EventTicketType[]) : null;
    return {
      id,
      date: asString(s.session_date) ?? asString(s.date) ?? event.event_date,
      startTime: asString(s.start_time) ?? event.start_time,
      endTime: asString(s.end_time) ?? event.end_time,
      ticketTypes: nested ?? event.ticket_types.filter((t) => t.session_id === id),
      code: asString(s.session_code),
      displayNo: i + 1,
      persisted: asString(s.id) !== null,
    };
  });
}

// Google's embed URLs (/maps/embed?pb=…) only work inside an iframe — opening
// one directly shows "The Google Maps Embed API must be used in an iframe".
// For those, link to a Maps search for the event's address instead; the older
// "?q=…&output=embed" style just needs the embed flag removed.
function getOpenInMapsUrl(event: OrganizerEvent): string | null {
  if (!event.map_url) return null;
  if (!event.map_url.includes("/maps/embed")) return event.map_url.replace(/([?&])output=embed&?/, "$1").replace(/[?&]$/, "");
  const query = event.address || [event.venue, event.city].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function TicketTypesTable({
  ticketTypes,
  ticketNos,
  editable,
  onAddType,
  onDeleteType,
  onEditType,
}: {
  ticketTypes: EventTicketType[];
  ticketNos: Map<string, number>;
  editable: boolean;
  onAddType: () => void;
  onDeleteType: (tt: EventTicketType) => void;
  onEditType: (tt: EventTicketType) => void;
}) {
  if (ticketTypes.length === 0) {
    return (
      <div className="px-5 py-4 text-xs text-muted-foreground italic flex items-center justify-between">
        <span>No ticket types configured for this session.</span>
        {editable && (
          <button
            type="button"
            onClick={onAddType}
            className="flex items-center gap-1.5 text-primary font-semibold text-xs not-italic hover:underline"
          >
            <Plus size={11} /> Add Ticket Type
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Types</span>
        {editable && (
          <button type="button" onClick={onAddType} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            <Plus size={11} /> Add Type
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["ID", "Name", "Price", "Total", "Available", "Sold"].map((h) => (
                <th key={h} className="text-left text-[10px] text-muted-foreground font-medium px-5 pb-2">
                  {h}
                </th>
              ))}
              {editable && (
                <th className="px-5 pb-2">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {ticketTypes.map((tt) => {
              const sold = tt.quantity - tt.available_quantity;
              const pct = tt.quantity > 0 ? Math.round((sold / tt.quantity) * 100) : 0;
              const low = tt.quantity > 0 && tt.available_quantity / tt.quantity < 0.15;
              return (
                <tr key={tt.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-[10px] text-muted-foreground">{tt.ticket_type_code ?? ticketNos.get(tt.id)}</td>
                  <td className="px-5 py-2.5 font-semibold">{tt.name}</td>
                  <td className="px-5 py-2.5 font-semibold">${tt.price}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{tt.quantity.toLocaleString()}</td>
                  <td className="px-5 py-2.5">
                    <span className={low ? "text-orange-600 font-semibold" : ""}>{tt.available_quantity.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  </td>
                  {editable && (
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${tt.name}`}
                          onClick={() => onEditType(tt)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${tt.name}`}
                          onClick={() => onDeleteType(tt)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  ticketNos,
  expanded,
  onToggle,
  editable,
  onAddType,
  onDeleteType,
  onEditType,
}: {
  session: PanelSession;
  ticketNos: Map<string, number>;
  expanded: boolean;
  onToggle: () => void;
  editable: boolean;
  onAddType: () => void;
  onDeleteType: (tt: EventTicketType) => void;
  onEditType: (tt: EventTicketType) => void;
}) {
  const tts = session.ticketTypes;
  const totalQty = tts.reduce((s, t) => s + t.quantity, 0);
  const totalAvail = tts.reduce((s, t) => s + t.available_quantity, 0);
  const sold = totalQty - totalAvail;
  const pct = totalQty > 0 ? Math.round((sold / totalQty) * 100) : 0;

  return (
    <div className={`border border-border rounded-xl overflow-hidden transition-all ${expanded ? "border-primary/40" : ""}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(ev) => {
          if (ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) {
            ev.preventDefault();
            onToggle();
          }
        }}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors text-left cursor-pointer"
      >
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(session.startTime)}</div>
        <div className="flex-shrink-0 text-xs text-muted-foreground">→</div>
        <div className="flex-shrink-0 w-24 text-sm font-bold font-(family-name:--font-display)">{fmtTime(session.endTime)}</div>
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {totalQty > 0 ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <div className={`h-full rounded-full ${pct >= 90 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {sold}/{totalQty}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tts.length} ticket type{tts.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">No ticket types yet</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground hidden md:block">{session.code ?? session.displayNo}</span>
          {editable && (
            <button
              type="button"
              aria-label="Edit session"
              onClick={(ev) => ev.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary"
            >
              <Edit2 size={12} />
            </button>
          )}
          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      {expanded && <TicketTypesTable ticketTypes={tts} ticketNos={ticketNos} editable={editable} onAddType={onAddType} onDeleteType={onDeleteType} onEditType={onEditType} />}
    </div>
  );
}

function ModalShell({
  title,
  saving,
  error,
  onClose,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !saving && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold font-(family-name:--font-display)">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {children}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

type NewTicketType = { name: string; price: string; quantity: number };
type TicketFieldsValue = { name: string; price: string; qty: string };

function parseTicketFields(v: TicketFieldsValue): NewTicketType | string {
  const quantity = Number(v.qty);
  if (!v.name.trim()) return "Ticket type name is required.";
  if (v.price.trim() === "" || !Number.isFinite(Number(v.price)) || Number(v.price) < 0) return "Enter a valid price (0 or more).";
  if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be a whole number of at least 1.";
  return { name: v.name.trim(), price: v.price.trim(), quantity };
}

function TicketFields({ value, onChange, autoFocus }: { value: TicketFieldsValue; onChange: (v: TicketFieldsValue) => void; autoFocus?: boolean }) {
  return (
    <>
      <div>
        <label className={lbl}>Name</label>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. General Admission"
          className={inp}
          autoFocus={autoFocus}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
            placeholder="0.00"
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>Quantity</label>
          <input
            type="number"
            min="1"
            step="1"
            value={value.qty}
            onChange={(e) => onChange({ ...value, qty: e.target.value })}
            placeholder="100"
            className={inp}
          />
        </div>
      </div>
    </>
  );
}

function AddSlotModal({
  defaultDate,
  saving,
  error,
  onClose,
  onSave,
}: {
  defaultDate: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { date: string; startTime: string; endTime: string; ticket: NewTicketType }) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ticket, setTicket] = useState<TicketFieldsValue>({
    name: "",
    price: "",
    qty: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    if (!date || !startTime || !endTime) return setLocalError("Date, start time, and end time are required.");
    if (endTime <= startTime) return setLocalError("End time must be after the start time.");
    const parsed = parseTicketFields(ticket);
    if (typeof parsed === "string") return setLocalError(parsed);
    setLocalError(null);
    onSave({ date, startTime, endTime, ticket: parsed });
  }

  return (
    <ModalShell title="Add Slot" saving={saving} error={localError ?? error} onClose={onClose} onSubmit={submit} submitLabel="Add Slot">
      <div>
        <label className={lbl}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Start Time</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>End Time</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="pt-3 border-t border-border space-y-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Ticket Type</div>
          <p className="text-xs text-muted-foreground mt-1">Every slot needs at least one ticket type. You can add more afterwards.</p>
        </div>
        <TicketFields value={ticket} onChange={setTicket} />
      </div>
    </ModalShell>
  );
}

function AddTypeModal({
  saving,
  error,
  onClose,
  onSave,
}: {
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: NewTicketType) => void;
}) {
  const [ticket, setTicket] = useState<TicketFieldsValue>({
    name: "",
    price: "",
    qty: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    const parsed = parseTicketFields(ticket);
    if (typeof parsed === "string") return setLocalError(parsed);
    setLocalError(null);
    onSave(parsed);
  }

  return (
    <ModalShell title="Add Ticket Type" saving={saving} error={localError ?? error} onClose={onClose} onSubmit={submit} submitLabel="Add Type">
      <TicketFields value={ticket} onChange={setTicket} autoFocus />
    </ModalShell>
  );
}

function EditTypeModal({
  ticket: original,
  saving,
  error,
  onClose,
  onSave,
}: {
  ticket: EventTicketType;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: NewTicketType) => void;
}) {
  const [ticket, setTicket] = useState<TicketFieldsValue>({
    name: original.name,
    price: String(original.price),
    qty: String(original.quantity),
  });
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    const parsed = parseTicketFields(ticket);
    if (typeof parsed === "string") return setLocalError(parsed);
    const sold = original.quantity - original.available_quantity;
    if (parsed.quantity < sold) return setLocalError(`Quantity can't be lower than the ${sold} ticket${sold !== 1 ? "s" : ""} already sold.`);
    setLocalError(null);
    onSave(parsed);
  }

  return (
    <ModalShell title="Edit Ticket Type" saving={saving} error={localError ?? error} onClose={onClose} onSubmit={submit} submitLabel="Save Changes">
      <TicketFields value={ticket} onChange={setTicket} autoFocus />
    </ModalShell>
  );
}

export function EventDetailPanel({
  event,
  onBack,
  onChanged,
}: {
  event: OrganizerEvent;
  onBack: () => void;
  onChanged?: (updated: OrganizerEvent) => void;
}) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const image = extractImageUrl(event.images[0]) ?? FALLBACK_IMAGE;
  const sessions = useMemo(() => getSessions(event), [event]);

  function closeModal() {
    setModal(null);
    setSaveError(null);
  }

  async function save(next: SessionDraft[], successMessage: string, expandId?: string) {
    // The API rejects a multi-session event if any session has no ticket types
    // (common on drafts), so say which one to fix instead of showing a raw 422.
    const empty = next.length > 1 ? next.find((d) => d.ticketTypes.length === 0) : undefined;
    if (empty) {
      setSaveError(`The slot on ${fmtDateLong(empty.date)} (${fmtTime(empty.startTime)}) has no ticket types. Add a ticket type to it first, then try again.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      await saveEventSessions(event, next, token);
      // The update response may not match the retrieve shape; refetch.
      const fresh = await getEvent(event.id, token);
      onChanged?.(fresh);
      if (expandId) setExpandedSession(expandId);
      setModal(null);
      setToast({ type: "success", message: successMessage });
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditType(ticket: EventTicketType, v: NewTicketType) {
    setSaving(true);
    setSaveError(null);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      await updateTicketType(event.id, ticket.id, { name: v.name, price: Number(v.price), quantity: v.quantity }, token);
      setModal(null);
      setToast({ type: "success", message: `Ticket type "${v.name}" updated.` });
      try {
        onChanged?.(await getEvent(event.id, token));
      } catch {
        setToast({ type: "error", message: `"${v.name}" was updated, but the page couldn't refresh. Please reload.` });
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteType(ticket: EventTicketType) {
    setSaving(true);
    setSaveError(null);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      await deleteTicketType(event.id, ticket.id, token);
      setModal(null);
      setToast({ type: "success", message: `Ticket type "${ticket.name}" deleted.` });
      try {
        onChanged?.(await getEvent(event.id, token));
      } catch {
        setToast({ type: "error", message: `"${ticket.name}" was deleted, but the page couldn't refresh. Please reload.` });
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Posts only the new slot; existing sessions are left untouched, so empty
  // sessions on a draft no longer block adding one.
  async function handleAddSlot(v: { date: string; startTime: string; endTime: string; ticket: NewTicketType }) {
    setSaving(true);
    setSaveError(null);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
      await createSession(
        event.id,
        {
          session_date: v.date,
          start_time: v.startTime,
          end_time: v.endTime,
          ticket_types: [{ name: v.ticket.name, price: Number(v.ticket.price), quantity: v.ticket.quantity }],
        },
        token,
      );
      setModal(null);
      setToast({ type: "success", message: "Slot added." });
      try {
        onChanged?.(await getEvent(event.id, token));
      } catch {
        setToast({ type: "error", message: "Slot was added, but the page couldn't refresh. Please reload." });
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddType(sessionId: string, v: NewTicketType) {
    const drafts = sessions.map((s) => {
      const d = toDraft(s);
      return s.id === sessionId ? { ...d, ticketTypes: [...d.ticketTypes, v] } : d;
    });
    save(drafts, "Ticket type added.", sessionId);
  }

  const dateGroups = useMemo(() => {
    const map: Record<string, PanelSession[]> = {};
    sessions.forEach((s) => {
      (map[s.date] ??= []).push(s);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  const ticketNos = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((sess) => sess.ticketTypes.forEach((t) => map.has(t.id) || map.set(t.id, map.size + 1)));
    return map;
  }, [sessions]);

  const allTTs = event.ticket_types;
  const totalCap = allTTs.reduce((sum, t) => sum + t.quantity, 0);
  const totalAvail = allTTs.reduce((sum, t) => sum + t.available_quantity, 0);
  const totalSold = totalCap - totalAvail;
  const revenue = allTTs.reduce((sum, t) => sum + Number(t.price || 0) * (t.quantity - t.available_quantity), 0);
  // API uses "completed" for a finished event; StatusBadge's "ended" key
  // is what renders that as "Completed" with the gray/finished style.
  const openInMapsUrl = getOpenInMapsUrl(event);
  // Finished events are read-only; draft and on-sale events can be changed.
  const editable = event.status !== "completed";
  const status = event.status === "completed" ? "ended" : event.status.replace(/_/g, "-");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative h-44 flex-shrink-0 bg-secondary overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={event.name} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
          <div>
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft size={12} /> All Events
            </button>
            <h2 className="text-xl font-bold leading-tight font-(family-name:--font-display)">{event.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {event.venue}
                {event.city ? `, ${event.city}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/organizer/events/${event.id}/edit`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary/15 transition-colors"
            >
              <Edit2 size={12} /> Edit
            </Link>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-stretch border-b border-border flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border flex-1">
          {[
            { label: "Sessions", value: sessions.length },
            { label: "Total Capacity", value: totalCap.toLocaleString() },
            { label: "Tickets Sold", value: totalSold.toLocaleString() },
            {
              label: "Revenue",
              value: revenue > 0 ? `$${revenue.toLocaleString()}` : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm font-bold mt-0.5 font-(family-name:--font-display)">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Location */}
        {(event.address || event.map_url) && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                <span className="text-sm font-bold font-(family-name:--font-display)">Location</span>
              </div>
              {openInMapsUrl && (
                <a
                  href={openInMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  Open in Maps <ChevronRight size={11} />
                </a>
              )}
            </div>
            {event.address && (
              <div className="px-5 py-3 text-sm text-muted-foreground flex items-start gap-2">
                <MapPin size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                {event.address}
              </div>
            )}
            {event.map_url && (
              <div className="relative w-full" style={{ height: 220 }}>
                <iframe
                  src={event.map_url}
                  width="100%"
                  height="220"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map for ${event.name}`}
                />
              </div>
            )}
          </div>
        )}

        {event.description && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-2 font-(family-name:--font-display)">About</h3>
            <div
              className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-(family-name:--font-display)">Sessions</h3>
          {editable && (
            <button
              type="button"
              // Default to the latest existing date; the dialog's date field is editable.
              onClick={() =>
                setModal({
                  kind: "slot",
                  date: dateGroups[dateGroups.length - 1]?.[0] ?? event.event_date,
                })
              }
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
            >
              <Plus size={11} /> Add Slot
            </button>
          )}
        </div>

        {dateGroups.map(([date, dateSessions]) => (
          <div key={date}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
                <h3 className="text-sm font-bold font-(family-name:--font-display)">{fmtDateLong(date)}</h3>
                <span className="text-xs text-muted-foreground">
                  {dateSessions.length} slot
                  {dateSessions.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {dateSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  ticketNos={ticketNos}
                  expanded={expandedSession === s.id}
                  onToggle={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                  editable={editable}
                  onAddType={() => setModal({ kind: "type", sessionId: s.id })}
                  onDeleteType={(ticket) => setModal({ kind: "delete", ticket })}
                  onEditType={(ticket) => setModal({ kind: "edit", ticket })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {modal?.kind === "slot" && (
        <AddSlotModal defaultDate={modal.date} saving={saving} error={saveError} onClose={closeModal} onSave={handleAddSlot} />
      )}
      {modal?.kind === "type" && (
        <AddTypeModal saving={saving} error={saveError} onClose={closeModal} onSave={(v) => handleAddType(modal.sessionId, v)} />
      )}
      {modal?.kind === "edit" && (
        <EditTypeModal ticket={modal.ticket} saving={saving} error={saveError} onClose={closeModal} onSave={(v) => handleEditType(modal.ticket, v)} />
      )}
      {modal?.kind === "delete" && (
        <ModalShell
          title="Delete Ticket Type"
          saving={saving}
          error={saveError}
          onClose={closeModal}
          onSubmit={() => handleDeleteType(modal.ticket)}
          submitLabel="Delete"
        >
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{modal.ticket.name}</span>? This can&apos;t be undone.
          </p>
        </ModalShell>
      )}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 max-w-sm rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={16} className="flex-shrink-0" /> : <XCircle size={16} className="flex-shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
