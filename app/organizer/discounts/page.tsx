"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Copy, Plus, Trash2, X, XCircle } from "lucide-react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  createDiscount,
  deleteDiscount,
  formatDate,
  getDiscounts,
  getEvent,
  getMyEvents,
  type DiscountItem,
  type DiscountType,
  type DiscountsResponse,
  type MyEventListItem,
  type OrganizerEvent,
} from "@/lib/api";
import { getSessions } from "@/components/organizer/event-detail-panel";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/badge";

const INPUT_CLASS =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground disabled:opacity-60";
const LABEL_CLASS = "text-xs text-muted-foreground font-medium mb-1.5 block";

function getToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

function getDiscountUses(d: DiscountItem): number {
  return d.used_count ?? d.uses ?? 0;
}

function isExpired(d: DiscountItem): boolean {
  if (d.status) return d.status.toLowerCase() !== "active";
  if (d.is_active === false) return true;
  return d.end_at ? new Date(d.end_at).getTime() < Date.now() : false;
}

function fmtExpiry(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : formatDate(iso);
}

export default function DiscountsPage() {
  const [show, setShow] = useState(false);
  const [events, setEvents] = useState<MyEventListItem[]>([]);
  const [filterEventId, setFilterEventId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DiscountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [eventId, setEventId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percentage");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DiscountItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    getMyEvents(getToken())
      .then((res) => setEvents(res.results))
      .catch(() => setToast({ type: "error", message: "Couldn't load events for the form. Please reload." }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDiscounts(page, filterEventId || null, getToken())
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Failed to load discounts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, filterEventId, reloadKey]);

  // The list items don't carry sessions/ticket types, so fetch the selected event.
  const [eventDetail, setEventDetail] = useState<OrganizerEvent | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  function handleEventChange(id: string) {
    setEventId(id);
    setSessionId("");
    setTicketTypeId("");
    setEventDetail(null);
    setFormError(null);
    if (!id) return;
    setLoadingDetail(true);
    getEvent(id, getToken())
      .then((ev) => setEventDetail(ev))
      .catch((err) => setFormError(err instanceof ApiError ? err.message : "Couldn't load this event's sessions."))
      .finally(() => setLoadingDetail(false));
  }

  // Discounts can only be created for events that are on sale (API sends "on_sale").
  const onSaleEvents = useMemo(() => events.filter((e) => e.status.replace(/_/g, "-") === "on-sale"), [events]);

  const sessions = useMemo(() => (eventDetail ? getSessions(eventDetail).filter((s) => s.persisted) : []), [eventDetail]);
  const ticketTypes = sessions.find((s) => s.id === sessionId)?.ticketTypes ?? [];

  function closeForm() {
    setShow(false);
    handleEventChange("");
    setCode("");
    setType("percentage");
    setValue("");
    setMaxUses("");
    setStartAt("");
    setEndAt("");
    setFormError(null);
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteDiscount(deleting.id, getToken());
      const code = deleting.code;
      // Deleting the last row of a later page would leave it empty; step back.
      if (page > 1 && data?.results.length === 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
      closeDelete();
      setToast({ type: "success", message: `Discount "${code}" deleted.` });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCreate() {
    const numValue = Number(value);
    const numMax = Number(maxUses);
    if (!eventId || !sessionId || !ticketTypeId || !code.trim() || !value || !maxUses || !startAt || !endAt) {
      return setFormError("Please fill in all fields.");
    }
    if (!(numValue > 0)) return setFormError("Discount value must be greater than 0.");
    if (type === "percentage" && numValue > 100) return setFormError("Percentage can't be more than 100.");
    if (!Number.isInteger(numMax) || numMax < 1) return setFormError("Max uses must be a whole number of at least 1.");
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setFormError("Enter valid start and end dates.");
    if (end <= start) return setFormError("End date/time must be after the start date/time.");

    setSaving(true);
    setFormError(null);
    try {
      await createDiscount(
        {
          event_id: eventId,
          session_id: sessionId,
          ticket_type_id: ticketTypeId,
          code: code.trim().toUpperCase(),
          discount_type: type,
          value: numValue,
          max_uses: numMax,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        },
        getToken(),
      );
      closeForm();
      setToast({ type: "success", message: "Discount code created." });
      if (page === 1) setReloadKey((k) => k + 1);
      else setPage(1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Discounts & Coupons"
        subtitle="Create and manage discount codes for your events."
        action={
          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> New Code
          </button>
        }
      />
      {show && (
        <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm font-(family-name:--font-display)">Create Discount Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Event</label>
              <Select
                value={eventId}
                onChange={handleEventChange}
                placeholder="Select event"
                ariaLabel="Event"
                options={onSaleEvents.map((ev) => ({ value: ev.id, label: ev.name }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Session</label>
              <Select
                value={sessionId}
                onChange={(v) => {
                  setSessionId(v);
                  setTicketTypeId("");
                }}
                disabled={!eventId || loadingDetail}
                placeholder={loadingDetail ? "Loading sessions…" : "Select session"}
                ariaLabel="Session"
                options={sessions.map((s) => ({
                  value: s.id,
                  label: `${formatDate(s.date)} · ${s.startTime?.slice(0, 5) ?? "—"}–${s.endTime?.slice(0, 5) ?? "—"}${s.code ? ` (${s.code})` : ""}`,
                }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Ticket Type</label>
              <Select
                value={ticketTypeId}
                onChange={setTicketTypeId}
                disabled={!sessionId}
                placeholder="Select ticket type"
                ariaLabel="Ticket type"
                options={ticketTypes.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. BOUNCE20"
                className={`${INPUT_CLASS} font-mono uppercase placeholder:normal-case`}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Discount Type</label>
              <Select
                value={type}
                onChange={(v) => setType(v as DiscountType)}
                ariaLabel="Discount type"
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed", label: "Fixed Amount ($)" },
                ]}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Value</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="e.g. 20" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Max Uses</label>
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="e.g. 100" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Start Date &amp; Time</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>End Date &amp; Time</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
          {formError && (
            <p role="alert" className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={closeForm} disabled={saving} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create Code"}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          Event
        </span>
        <Select
          className="w-full sm:w-64"
          value={filterEventId}
          onChange={(v) => {
            setFilterEventId(v);
            setPage(1);
          }}
          placeholder="All events"
          ariaLabel="Filter by event"
          options={[{ value: "", label: "All events" }, ...events.map((ev) => ({ value: ev.id, label: ev.name }))]}
        />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {["Code", "Discount", "Event", "Uses", "Expires", "Status", ""].map((h, i) => (
                  <th key={i} className="text-left text-xs text-muted-foreground font-medium p-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.results ?? []).map((d) => {
                const uses = getDiscountUses(d);
                return (
                  <tr key={d.id} className="hover:bg-secondary/40">
                    <td className="p-4 font-mono text-sm font-bold">{d.code}</td>
                    <td className="p-4 text-xs font-semibold text-accent whitespace-nowrap">
                      {d.discount_type === "percentage" ? `${Number(d.value)}% off` : `$${Number(d.value)} off`}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">{d.event_name ?? "—"}</td>
                    <td className="p-4 text-xs min-w-28">
                      <span className="font-medium">{uses}</span>
                      <span className="text-muted-foreground"> / {d.max_uses}</span>
                      <ProgressBar value={uses} max={d.max_uses} color="#F97316" />
                    </td>
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{fmtExpiry(d.end_at)}</td>
                    <td className="p-4">
                      <StatusBadge status={isExpired(d) ? "expired" : "active"} />
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          aria-label={`Copy ${d.code}`}
                          onClick={() => navigator.clipboard?.writeText(d.code)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          aria-label={`Delete ${d.code}`}
                          onClick={() => setDeleting(d)}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && !data ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Loading discounts…</p>
        ) : loadError ? (
          <p className="p-6 text-sm text-red-500 text-center">{loadError}</p>
        ) : data && data.results.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No discount codes yet.</p>
        ) : (
          data && <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        )}
      </div>
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !deleteBusy && closeDelete()}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete discount"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold font-(family-name:--font-display)">Delete Discount</h3>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm text-muted-foreground">
              <p>
                Are you sure you want to delete <span className="font-mono font-semibold text-foreground">{deleting.code}</span>? This can&apos;t be undone.
              </p>
              {deleteError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2.5">{deleteError}</div>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={closeDelete}
                disabled={deleteBusy}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 max-w-sm rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
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
