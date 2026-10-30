"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Edit2, ImagePlus, Plus, X } from "lucide-react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ApiError,
  createAddOn,
  formatMoney,
  getAddOns,
  resolveMediaUrl,
  updateAddOn,
  type AddOnItem,
  type AddOnsResponse,
} from "@/lib/api";
import { ModalShell } from "@/components/organizer/modal-shell";
import { Pagination } from "@/components/ui/pagination";

type Toast = { type: "success" | "error"; message: string };

const inp =
  "w-full min-w-0 max-w-full appearance-none bg-background border border-border rounded-xl px-3 py-2 text-base sm:text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground";
const lbl = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block";

function getToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
}

function AddOnFormModal({
  addOn,
  saving,
  error,
  onClose,
  onSave,
}: {
  addOn: AddOnItem | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { name: string; price: string; description: string; is_active: boolean; image: File | null; remove_image: boolean }) => void;
}) {
  const [name, setName] = useState(addOn?.name ?? "");
  const [price, setPrice] = useState(addOn ? String(Number(addOn.price)) : "");
  const [description, setDescription] = useState(addOn?.description ?? "");
  const [isActive, setIsActive] = useState(addOn?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const currentImage = removeImage ? null : resolveMediaUrl(addOn?.image);
  const shownImage = preview ?? currentImage;

  function submit() {
    const numPrice = Number(price);
    if (!name.trim()) return setLocalError("Name is required.");
    if (!price.trim() || !Number.isFinite(numPrice) || numPrice < 0) return setLocalError("Enter a valid price (0 or more).");
    setLocalError(null);
    onSave({ name: name.trim(), price: String(numPrice), description: description.trim(), is_active: isActive, image: file, remove_image: removeImage && !file });
  }

  return (
    <ModalShell
      title={addOn ? "Edit Add-on" : "New Add-on"}
      saving={saving}
      error={localError ?? error}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={addOn ? "Save Changes" : "Create Add-on"}
    >
      <div>
        <label className={lbl}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP Parking" className={inp} autoFocus />
      </div>
      <div>
        <label className={lbl}>Price ($)</label>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="e.g. 25" className={inp} />
      </div>
      <div>
        <label className={lbl}>
          Description <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inp} resize-none`} />
      </div>
      <div>
        <label className={lbl}>
          Image <span className="normal-case font-normal">(optional)</span>
        </label>
        {shownImage ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownImage} alt="Add-on" className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-semibold bg-black/60 text-white px-2.5 py-1 rounded-full hover:bg-black/80"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRemoveImage(true);
                }}
                aria-label="Remove image"
                className="w-6 h-6 flex items-center justify-center bg-black/60 rounded-full text-white hover:bg-red-500"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
          >
            <ImagePlus size={18} />
            <span className="text-xs font-medium">Click to upload</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setRemoveImage(false);
            }
            e.target.value = "";
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary w-4 h-4" />
        Active (available to attendees)
      </label>
    </ModalShell>
  );
}

export function EventAddOns({ eventId, editable, onToast }: { eventId: string; editable: boolean; onToast: (t: Toast) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AddOnsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<{ addOn: AddOnItem | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAddOns(eventId, page, getToken())
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load add-ons.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, page, reloadKey]);

  function closeModal() {
    setModal(null);
    setSaveError(null);
  }

  async function handleSave(v: Parameters<React.ComponentProps<typeof AddOnFormModal>["onSave"]>[0]) {
    if (!modal) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (modal.addOn) await updateAddOn(modal.addOn.id, v, getToken());
      else await createAddOn(eventId, v, getToken());
      onToast({ type: "success", message: modal.addOn ? "Add-on updated." : "Add-on created." });
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Sends no image fields, so the stored image is left as is.
  async function toggleActive(a: AddOnItem) {
    setTogglingId(a.id);
    try {
      await updateAddOn(
        a.id,
        { name: a.name, price: a.price, description: a.description ?? "", is_active: !a.is_active },
        getToken(),
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      onToast({ type: "error", message: err instanceof ApiError ? err.message : "Couldn't update status." });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-bold font-(family-name:--font-display)">Add-ons</h3>
        {editable && (
          <button type="button" onClick={() => setModal({ addOn: null })} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            <Plus size={11} /> New Add-on
          </button>
        )}
      </div>

      {loading && !data ? (
        <p className="p-6 text-sm text-muted-foreground text-center">Loading add-ons…</p>
      ) : loadError ? (
        <p className="p-6 text-sm text-red-500 text-center">{loadError}</p>
      ) : data && data.results.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">No add-ons for this event yet.</p>
      ) : (
        data && (
          <>
            <ul className="divide-y divide-border">
              {data.results.map((a) => {
                const img = resolveMediaUrl(a.image);
                return (
                  <li key={a.id} className="p-4 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-x-3 sm:gap-x-4 gap-y-3">
                    <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center text-muted-foreground">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus size={18} aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 basis-0 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 text-sm font-semibold leading-snug break-words line-clamp-2">{a.name}</span>
                        <span
                          className={`flex-shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            a.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-secondary text-muted-foreground border-border"
                          }`}
                        >
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-base font-semibold leading-6 text-slate-700 font-(family-name:--font-display)">{formatMoney(a.price)}</div>
                      {a.description && (
                        <p title={a.description} className="text-xs text-muted-foreground leading-relaxed break-words line-clamp-2">
                          {a.description}
                        </p>
                      )}
                    </div>
                    {editable && (
                      <div className="flex items-center gap-2 flex-shrink-0 basis-full justify-end sm:basis-auto sm:justify-start">
                        <button
                          type="button"
                          onClick={() => toggleActive(a)}
                          disabled={togglingId === a.id}
                          className="h-8 whitespace-nowrap text-xs font-semibold px-3 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          {a.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ addOn: a })}
                          aria-label={`Edit ${a.name}`}
                          title="Edit"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {data.total > data.page_size && <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />}
          </>
        )
      )}

      {modal && <AddOnFormModal addOn={modal.addOn} saving={saving} error={saveError} onClose={closeModal} onSave={handleSave} />}
    </div>
  );
}
